#todb

An in process key value store for node. I'm looking to be able to replace leveldb without any binary dependencies. Medea is the best solution to this, however it has a couple of issues:
* Key's have to remain in memory.
* The data is extremely fragmented, one of the best features of leveldb is the ability to query based on a range of keys. This results in plenty of get requests within Medea and seeking across files.

Otherwise Medea is fantastic and is better and more robust than this project in every way.

Currently todb is a persistent in memory key, value store. This will change when compacting is introduced in the next version, at that point it will still require key's to be in memory. 

# Goals: 
* Read optimised design. ✓
* Key's can be greater than memory.
* Supports level db style querying by range natively.
* Pretty fast. ✓
* ACID. ✓
* Streams.
* Batch Support.
* Multi threaded.
* Fault tolerant.

##How it (will) work.
Changes are placed into an append only log file. The log file and it's values is always in memory (in the current design). When compaction occurs the items will be placed in a sorted order into a db file (or multiple db files). The database will be sorted into sections based on keys, each section will have the internal keys, byte length, and offset in it's header. The header for the entire db will have the offset and length of each section.

Most likely the db will have to be split into multiple files for quick compaction. If this is the case there will be a global registrar file, the contents of which will be kept in memory.

##So what works now?

Well right now (as stated above) It's simply a persistent in memory KV store. It hasn't been battle tested and is still under development.

##api

###put( key , value , callback )
`put` is an async method to put the value into the datastore, it won't be there immediately.
**Key:** the `key` of the object.
**Value:** the `value` of the object.
**Callback:** fires when the put request is succesful (it's been written to disk). Has an `error` in it's arguments if an error has occured.

###get( key , callback )
`get` is an async method to get the value from the datastore.
**Key:** they `key` of the object to retrieve.
**Callback:** fires when the get request is succesful. The arguments are `error`, `value`.

###del( key , callback )
`del` is an async method to delete the value from the datastore.
**Key:** the `key` of the object to delete.
**Callback:** fires when the delete is succesfull. The arguments are `error`

##Example
```javascript
//Load a db
var db = new DB("./test.db" , ( err , db ) => {
	db.put( "RA" , "CAT" , ( err ) => {
		db.get("RA" , ( err , value ) => console.log( value ));
		db.del("RA");

	});
	db.close();
});

```