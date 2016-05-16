#todb

The goal of this project is to create an in process JSON aware document oriented database for node.

Currently todb is a persistent in memory key, value store. This will change when compacting is introduced in the next version, at that point it will still require key's to be in memory. 

# Goals: 
* Read optimised design. ✓
* Keys can be greater than memory.
* Support levelDB style querying by range natively.
* Indexes (provided by a reverse lookup table).
* Querying of unindexed data (will be slow).
* Query API, I'm thinking chainable function calls rather than JSON or SQL Like.
* Fast. ✓
* ACID. ✓
* Streams.
* Batch Support.
* Multi threaded.
* Fault tolerant.


##So what works now?

Well right now (as stated above) It's simply a persistent in memory KV store. It hasn't been battle tested and is still under heavy development.

##api

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