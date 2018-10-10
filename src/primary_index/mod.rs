/*
A primary index file is fairly simple, it's just a list of byte offsets for each record.
It's sequential and starts at 1, if there's gaps in the index then those will be null bytes.
The first 16 bytes is the current length of the index.
It is not immutable, if a record is overwriten then the last location of the record is recorded at the index.
*/
use std::fs::File;
use std::fs::OpenOptions;
use std::path::PathBuf;
use std::io::SeekFrom;
use std::io::Seek;
use std::io::Write;
use std::io::Read;

pub const INDEX_LENGTH: u8 = 16; // the length of an individual index in bytes

pub struct PrimaryIndex {
    pub table_name: String,
    pub length: usize,
    pub file: File,
    pub current_index: usize,
}

impl PrimaryIndex {
    pub fn new(table_name: &str, db_path: &str) -> PrimaryIndex {
        let mut index_path = PathBuf::from(db_path);
        index_path.push(table_name);
        index_path.set_extension("index");

        let mut file = OpenOptions::new().read(true).write(true).create(true).open(index_path).unwrap();
        let len = file.metadata().unwrap().len() as usize;
        let mut current_index: usize = 1;
        if (len > 0) {
            current_index = get_highest_index_from_file(&file) + 1;
        }

        PrimaryIndex {
            table_name: table_name.to_string(),
            length: len,
            file,
            current_index,
        }
    }

    // Increments the index by one and returns the index
    pub fn reserve_next(&mut self) -> usize {
        self.current_index += 1;
        self.current_index - 1
    }


    pub fn write_index(&mut self, index: usize, byte_offset: usize) {
        let position_in_index = (index * INDEX_LENGTH as usize);
        if position_in_index + 1 > self.length {
            self.double_index_size();
        }
        // write the record index
        self.file.seek(SeekFrom::Start(position_in_index as u64)).unwrap();
        self.file.write(format!("{:0width$x}", byte_offset, width = INDEX_LENGTH as usize).as_bytes()); // pad the id for the max that a unsigned 64bit int length

        // write the total length to the index header
        self.file.seek(SeekFrom::Start(0)).unwrap();
        self.file.write(format!("{:0width$x}", index, width = INDEX_LENGTH as usize).as_bytes()); // pad the id for the max that a unsigned 64bit int length
    }

    pub fn get_index(&mut self, index:usize) -> usize {
        let position_in_index = (index * INDEX_LENGTH as usize);
        let mut buffer=[0u8; 16];
        self.file.seek(SeekFrom::Start(position_in_index as u64)).unwrap();
        self.file.read(&mut buffer);
        let offset_string = String::from_utf8(buffer.to_vec()).unwrap();
        usize::from_str_radix(&offset_string, 16).unwrap()
    }

//    pub fn get_range(&mut self, low:usize, high:usize) -> Vec<usize> {
//
//    }


    // doubles the index size
    // to figure out how many items are in it. We need to store index length state some other way
    // if this is used
    fn double_index_size(&mut self) {
        if self.length == 0 {
            // if the key file is empty (or just created) then we create a new file with sequential access
            const smallest_size:usize = 256; // smallest size of key file in bytes
            self.file.set_len(smallest_size as u64);
            self.length = smallest_size;
        } else {
            println!("Doubling index size");
            self.length *= 2;
            // self.length += INDEX_LENGTH as usize;
            self.file.set_len(self.length as u64);
        }
    }

}


// read the first 16 bytes of the file and return the dec value (which is the highest value in the index)
fn get_highest_index_from_file(mut file:&File) -> usize {
    let mut buffer=[0u8; 16];
    file.seek(SeekFrom::Start(0)).unwrap();
    file.read(&mut buffer);
    let header_string = String::from_utf8(buffer.to_vec()).unwrap();
    let index_size = usize::from_str_radix(&header_string, 16).unwrap();
    index_size
}
