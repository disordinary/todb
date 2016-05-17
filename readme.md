![todb](https://raw.githubusercontent.com/disordinary/todb/master/docs/logo.png)

todb is an in process document orientated database written in node. 

##Goals
1. A JSON document store.
2. Keys can be larger than memory.
3. Indexible and searchable.
4. ACID compliant.

Recent modifications to data are stored in append only logs and kept in memory (and on disk), periodically they will be merged with existing data into SSTables. These SSTables are immutable so will be discarded once a merge is complete.  Keys will be kept in a seperate SSTable. This is similar to how LevelDB works.

Documents will be stored in JSON and will be queriable, indexes will be stored in seperate SSTables as reverse lookup tables. Additionally because of the SSTable data structure todb will be able to stream range values. 

As of right now todb is an in memory key value store with an append only log style format.

##Todo (hopefully in this order):
1. Append only log support ✓
2. Data compaction
3. Data indexing
4. Data querying
5. Moving out of the event loop 
6. Batch processing
7. Streaming
8. Abstract LevelDown support
9. Splitting files for larger datasets
10. Merging SSTables recursively, similar to a Log Structured Merge Tree.



##So what works now?

Well right now (as stated above) It's simply a persistent in memory KV store. It hasn't been battle tested and is still under heavy development.

##api
> This will change.

###put( key , value , callback )
`put` is an async method to put the value into the datastore, it won't be there immediately as it waits until it succesfully writes to append log.
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

##Limitations
A document with it's key can only be 9.99MB in size.

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
