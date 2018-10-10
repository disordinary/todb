#![feature(plugin)]
#[macro_use]
extern crate serde_derive;

extern crate serde;
extern crate serde_json;

mod primary_index;
mod secondary_index;
mod table;
mod find;

use std::fs::File;
use std::io::Read;

use serde_json::{Value, Error};

fn main() {



    let db_path = "/data/testdb";
    let mut t = table::Table::new("test_table", db_path);

    t.create_secondary_index("Type", secondary_index::key_types::Str(20));
    t.create_secondary_index("Name", secondary_index::key_types::Str(128));
    t.create_secondary_index("X", secondary_index::key_types::F32);
    t.create_secondary_index("Y", secondary_index::key_types::F32);



    // load_dummy_data(&mut t);


    println!("Get by id 3 {:?}", t.get(3));
    println!("Get by id 4 {:?}", t.get(4));
    println!("Get by id 33 {:?}", t.get(33));
    println!("Get by id 333 {:?}, has an index of {:?}", t.get(333), t.get(333).get_id());

    println!("Search index {:?}", t.secondary_indexes[0].get("TEST", "TEST2"));

    println!("{}", t.table_name);
}

fn load_dummy_data(t:&mut table::Table) {
    // load json from thing
    let mut s = String::new();
    File::open("data.json").unwrap().read_to_string(&mut s).unwrap();
    let n:Vec<serde_json::Value> = serde_json::from_str(&s).unwrap();
    for item in n.into_iter() {
        t.insert(&item.to_string());
        //println!("{:?}", item.to_string());
    }
}