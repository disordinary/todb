mod log_file;
mod index_search;

use std::fs;
use std::fs::File;
use std::fs::OpenOptions;
use std::ffi::OsStr;
use std::path::PathBuf;
use std::io::SeekFrom;
use std::io::Seek;
use std::io::Write;
use std::io::Read;
use std::cmp::Ordering;
use std::cmp::PartialOrd;
use std::iter::Iterator;

use serde;
use serde_json;
use serde_json::{Value, Error};

use table;

use self::log_file::LogFile;

const LOG_LENGTH_BEFORE_INDEX:usize = 4_096; // how many log entries before we create a new index

#[derive(Copy, Clone, PartialEq, Debug)]
pub enum key_types {
    I8,
    I16,
    I32,
    I64,
    U8,
    U16,
    U32,
    U64,
    F32,
    F64,
    Str(u8),
    Bool,
}

impl key_types {
    fn get_length(self) -> u8 {
        match self {
            key_types::I8 => 2,
            key_types::I16 => 4,
            key_types::I32 => 8,
            key_types::I64 => 16,
            key_types::U8 => 2,
            key_types::U16 => 4,
            key_types::U32 => 8,
            key_types::U64 => 16,
            key_types::F32 => 32,
            key_types::F64 => 64,
            key_types::Str(length) => length,
            key_types::Bool => 1,
        }
    }

    // do a cmp
    fn do_sort_comp(left: &IndexRecord, right: &IndexRecord) -> Ordering {
        if left.key_type != right.key_type {
            // not match, panic
            panic!("shit!");
        } else {
            match left.key_type {
                key_types::I8 | key_types::I16 | key_types::I32 | key_types::I64 => {
                    let left_int = left.val.parse::<isize>().unwrap();
                    let right_int = right.val.parse::<isize>().unwrap();
                    left_int.cmp(&right_int)
                },
                key_types::U8 | key_types::U16 | key_types::U32 | key_types::U64 | key_types::Bool => {
                    let left_uint = left.val.parse::<usize>().unwrap();
                    let right_uint = right.val.parse::<usize>().unwrap();
                    left_uint.cmp(&right_uint)
                },
                key_types::F32 | key_types::F64 => {
                    let left_float = left.val.parse::<f64>().unwrap();
                    let right_float = right.val.parse::<f64>().unwrap();

                    match left_float.partial_cmp(&right_float) {
                        Some(x) => x,
                        None => panic!("shit2"),
                    }
                },
                key_types::Str(_) => left.val.cmp(&right.val)
            }
        }
    }
}

pub struct IndexRecord {
    pub val: String,
    pub key_type: key_types,
}

pub struct IndexFile {
    pub file: File,
    pub len: usize,
}
pub struct Index {
    pub name: String,
    pub table_name: String,
    pub db_path: String,
    pub key_type: key_types,
    pub len: usize,
    pub files: Vec<IndexFile>,
    pub log_file: LogFile,
}

impl Index {
    pub fn new(name:&str, key_type: key_types, table_name:&str, db_path:&str) -> Index {
        let log_file = LogFile::new(name, table_name, db_path, key_type);
        let files = read_index_files(name, key_type, table_name, db_path);

        Index {
            name: name.to_string(),
            table_name: table_name.to_string(),
            db_path: db_path.to_string(),
            key_type,
            len: 0, //combined length of all indexes
            files,
            log_file,
        }
    }

    pub fn update(&mut self, object: &table::TableRow) {
        let name = &self.name.clone();
        // if the object has this index in it then process it.

        match object.p.get(name) {
            Some(obj) => {
                match self.key_type {
                    key_types::Str(_) => self.add(&obj.as_str().unwrap(), object.get_id()),
                    _ => self.add(&obj.to_string(), object.get_id())
                }

            },
            None => (),
        };
    }

    fn add(&mut self,  value: &str, id: usize) {
        self.maybe_write_log_to_index(value.to_string(), id);
        // self.log_file.add(val.to_string(), id);
    }

    pub fn get(&mut self, low: &str, high: &str) {
        // iterate the files that make up this index
        for file in &self.files {
            index_search::search(&file, &self.key_type, low.to_string(), high.to_string());
        }
        // find low in index_search

        // find high in index_search

        // split into ids

        // return an iterator
    }

    fn maybe_write_log_to_index(&mut self, value: String, id: usize) {
        self.log_file.add(value.to_string(), id);
        // 1. If length is more then threshold the sort the log file
        if self.log_file.records.len() >= LOG_LENGTH_BEFORE_INDEX as usize {
            println!("Index is bigger than threshold, creating new index file");

            self.log_file.records.sort_by(|record, record2 | record.1.cmp(&record2.1) );

            // 2. Create a new index and write to it
            let current_index_file = self.files.len() + 1;
            let mut path = PathBuf::from(&self.db_path);
            path.push(&(self.table_name.to_string() + "-" + &self.name));
            path.set_extension(current_index_file.to_string());
            let mut file = OpenOptions::new().read(true).write(true).create(true).open(path).unwrap();
            let mut count:usize = 0;
            for record in &self.log_file.records {
                let length = self.key_type.get_length() as usize;
                let mut value = format!("{:0>width$}", &record.1, width=length);
                value.truncate(length);
                file.write(format!("{}{:0id_width$x}", value, record.0, id_width=16).as_bytes()); // pad the id for the max that a unsigned 64bit int length
                count += 1;
            }
            // 3. Cycle old logs
            self.log_file.cycle();

            // 4. add index
            self.files.push(IndexFile { file, len: count});
            //panic!("JUST STOPPIGN");
        }
    }
}

fn read_index_files(name: &str, key_type: key_types, table_name: &str, db_path: &str) -> Vec<IndexFile> {
    let paths = fs::read_dir(db_path).unwrap();
    let mut index_files:Vec<IndexFile> = vec![];
    for path in paths {
        let path = (path.unwrap() as fs::DirEntry).path();
        if path.file_stem().unwrap().to_string_lossy() == table_name.to_string() + "-" + name {
            let extension = path.extension().unwrap().to_string_lossy();
            if extension != "log" {
                index_files.push(load_index_file(name, key_type, table_name, db_path, &extension));
            }
        }
    }
    index_files
}

fn load_index_file(name:&str, key_type: key_types, table_name:&str, db_path:&str, suffix:&str) -> IndexFile {
    let mut index_path = PathBuf::from(db_path);
    index_path.push(table_name.to_string() + "-" + name);
    index_path.set_extension(suffix);
    let mut file = OpenOptions::new().read(true).write(true).create(true).open(index_path).unwrap();
    let len = file.metadata().unwrap().len() as usize;
    IndexFile {
        file,
        len: len / (key_type.get_length() as usize + 16) //the length of a key
    }
}