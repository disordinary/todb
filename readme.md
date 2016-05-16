#todb

An in process key value store for node. I'm looking to be able to replace leveldb without any binary dependencies. Medea is the best solution to this, however it has a couple of issues:
* Key's have to remain in memory.
* The data is extremely fragmented, one of the best features of leveldb is the ability to query based on a range of keys. This results in plenty of get requests within Medea and seeking across files.

Otherwise Medea is fantastic and is better and more robust than this project in every way.

Currently todb is a persistant in memory key, value store. This will change when compacting is introduced in the next version, at that point it will still require key's to be in memory. 

# Goals: 
* Read optimised design. ✓
* Key's can be greater than memory.
* Supports level db style querying by range natively.
* Pretty fast. ✓
* ATOMIC. ✓
* Streams.
* Batch Support.
* Multi threaded.
* Fault tollerant.

##How it (will) work.
Changes are placed into an append only log file. The log file and it's values is always in memory (in the current design). When compaction occurs the items will be placed in a sorted order into a db file (or multiple db files). The database will be sorted into sections based on keys, each section will have the internal keys, byte length, and offset in it's header. The header for the entire db will have the offset and length of each section.

Most likely the db will have to be split into multiple files for quick compaction. If this is the case there will be a global registrar file, the contents of which will be kept in memory.

##So what works now?

Well right now (as stated above) It's simply a persistant in memory KV store. It hasn't been battle tested and is still under development.