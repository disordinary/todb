use secondary_index;
use primary_index;

use std::fs::File;
use std::fs::OpenOptions;
use std::path::PathBuf;

use std::io::Read;
use std::io::Write;
use std::io::Seek;
use std::io::SeekFrom;

use serde;
use serde_json;
use serde_json::{Value, Error};

pub struct Table {
    pub table_name: String,
    pub db_path: String,
    pub length: usize,
    pub primary_index: primary_index::PrimaryIndex,
    pub secondary_indexes: Vec<secondary_index::Index>,
    pub file: File,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TableRow {
    pub i: String, //the id of the row (in hex)
    pub o: String, //the operation of the row (r = create/replace, d = delete, (todo)u = update)
    pub p: Value, // the actual row
    // pub indexes, indexes and offsets for this item

}

impl TableRow {
    pub fn get_id(&self) -> usize {
        usize::from_str_radix(&self.i, 16).unwrap()
    }
}

impl Table {
    pub fn new(table_name: &str, db_path: &str) -> Table {
        let mut table_path = PathBuf::from(db_path);
        table_path.push(table_name);


        let file = OpenOptions::new().read(true).append(true).create(true).open(table_path).unwrap();
        let len = file.metadata().unwrap().len() as usize;

        Table {
            table_name: table_name.to_string(),
            db_path: db_path.to_string(),
            length: len,
            primary_index: primary_index::PrimaryIndex::new(table_name, db_path),
            secondary_indexes: vec![],
            file: file,
        }
    }

    pub fn insert(&mut self, object: &str) {
        let id = self.primary_index.reserve_next();
        self.replace(object, id);
    }

    pub fn replace(&mut self, object: &str, id: usize) {
        let v: Value = serde_json::from_str(object).unwrap();

        let row = TableRow{
            i: format!("{:x}", id),
            o: "r".to_string(),
            p: v,
        };

        let object = serde_json::to_string(&row).unwrap();
        let length_in_bytes = object.len();
        let bytes_in_hex = format!("{:0width$x}", length_in_bytes, width = 16); // pad the id for the max that a unsigned 64bit int length

        let mut output = bytes_in_hex.to_owned();
        output.push_str(&object);

        let bytes = self.file.write(output.as_bytes()).unwrap();
        self.primary_index.write_index(id, self.length);
        self.length += bytes;

        // update index
        for mut secondary_index in &mut self.secondary_indexes {
            secondary_index.update(&row);
        }
    }

    pub fn get(&mut self, index: usize) -> TableRow {
        let index = (&self.primary_index.get_index(index)).clone();

        let mut buffer=[0u8; 16];
        self.file.seek(SeekFrom::Start(index as u64));
        self.file.read(&mut buffer);

        let length_of_row = String::from_utf8(buffer.to_vec()).unwrap();
        let row_size = usize::from_str_radix(&length_of_row, 16).unwrap();

        let mut row_buffer = vec![0; row_size];
        self.file.read(&mut row_buffer);

        let serialized = String::from_utf8(row_buffer).unwrap();
        let row: TableRow = serde_json::from_str(&serialized).unwrap();
        row
    }

    pub fn create_secondary_index(&mut self, index_name: &str, key_type: secondary_index::key_types) {
        self.secondary_indexes.push(
            secondary_index::Index::new(index_name, key_type, &self.table_name, &self.db_path)
        );
    }
}