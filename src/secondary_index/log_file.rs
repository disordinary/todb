use std::fs;
use std::fs::File;
use std::io::Read;
use std::io::Write;
use std::io::Seek;
use std::io::SeekFrom;
use std::path::PathBuf;
use std::fs::OpenOptions;
use std::str;


use secondary_index::key_types;

pub struct LogFile {
    pub path: PathBuf,
    pub name: String,
    pub records: Vec<(usize, String)>,
    pub file: File,
    pub key_type: key_types,
}
impl LogFile {
    pub fn new(name: &str, table_name: &str, db_path: &str, key_type: key_types) -> LogFile {
        let mut log_path = PathBuf::from(db_path);
        log_path.push(&(table_name.to_string() + "-" + name));
        log_path.set_extension("log");
        let file = OpenOptions::new().read(true).write(true).create(true).open(&log_path).unwrap();
        // process logfile and return that

        let mut log_file = LogFile {
            path: log_path,
            name: name.to_string(),
            records: vec![],
            file,
            key_type
        };

        log_file.load();

        log_file
    }

    pub fn cycle(&mut self) {
        //let path = &self.path;
//        drop(&self.file);
//        fs::remove_file(path);
//        let file = OpenOptions::new().read(true).write(true).create(true).open(path).unwrap();
        self.file.set_len(0);
        self.file.seek(SeekFrom::Start(0));
        self.records = vec![];
        //self.file = file;
    }

    pub fn add(&mut self, mut value: String, id: usize) {
        let length = self.key_type.get_length() as usize;
        let mut val_buf:Vec<u8> = LogFile::string_to_padded_byte_array(value.to_string(), length);
        let mut id_buf = LogFile::string_to_padded_byte_array(format!("{:x}", id), 16);

        val_buf.append(&mut id_buf);


        self.records.push((id, value.to_string()));
        self.file.write(&val_buf); // pad the id for the max that a unsigned 64bit int length
    }

    pub fn string_to_padded_byte_array(value: String, length: usize) -> Vec<u8> {

        let mut value = value.clone();
        value.truncate(length);

        let mut value = value.as_bytes();
        let mut vec_of_bytes:Vec<u8> = vec![0; length - value.len()];

        vec_of_bytes.append(&mut value.to_vec());
//
//        let mut v = vec![1, 2, 3];
//        let new = [7, 8];
//        let u: Vec<_> = v.splice((length - value.len()).., value.as_bytes().iter().clone()).collect();

        println!("DEBUG TEST {:?}", vec_of_bytes);
        vec_of_bytes
    }

    fn load(&mut self) {
        let mut buf:Vec<u8> = vec![];
        self.file.read_to_end(&mut buf);
        let mut cursor = 0;
        while cursor < buf.len() {

            let bytes = &buf[cursor..cursor + self.key_type.get_length() as usize];
            let pos = bytes.iter().rposition(|&i| i == 0).unwrap() + 1;

            let value = str::from_utf8(&buf[cursor + pos..cursor + self.key_type.get_length() as usize]).unwrap();
            cursor = cursor + self.key_type.get_length() as usize;
            let id = &buf[cursor..cursor + 16];

            let pos = id.iter().rposition(|&i| i == 0).unwrap() + 1;

            let offset_string = String::from_utf8(id[pos..].to_vec()).unwrap();
            let id = usize::from_str_radix(&offset_string, 16).unwrap();

            cursor = cursor + 16;
            self.records.push((id, value.to_string()))
        }

        // println!("Loaded index {:?}, counted {:?}", self.name, self.records.len());
    }
}