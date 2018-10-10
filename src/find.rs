use table;
pub enum OpType {
    Between,
    LT,
    GT,
    Nt,
    EQ,
}

pub struct Query {
    pub op: OpType,
    pub field: String,
    pub and: Option<Vec<Query>>,
    pub or: Option<Vec<Query>>,
    pub not: Option<Vec<Query>>,
}

pub struct Find {
    // information on the find, including the result id's which need to be looked up for all records
}

impl Find {
    // a query can is json and can be something like:
    // {"field": "age", "op": "Between", low: "18", high: "40" and: [{"field": "sex", "op":"EQ", "value": "f"}]}
    pub fn find(table: &table::Table, q: Query) {
        // find all indexes
        let indexes:Vec<String> = vec![];
    }

    // return an iterator
    pub fn get(table: &table::Table) {
        // iterate over records in main table
        // check that all query constraints are met including secondary indexes and non indexed
    }
}


