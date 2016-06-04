var async = require("async");
var Guid = require('guid');

var Log = require('append-log');
var ATable = require('./table_store.js');
var FastIndex = require('./fast_index.js');
var fs = require('fs');

const default_options = {
	id : 'id'
};
class Table {
	constructor( name , options , cb ) {
		this._options = Object.assign( { } , default_options , options || { } );
		this.name = name;
		this._kv = { }; //logs are kept in memory
        this._indexes = { };

        this.createIndex( this._options.id , ( _ ) => { console.log(""); });

		this._store = new ATable( name + '.at' , ( err , table ) => {
            console.log("S1DFSDFSDFSDF");
            //load from the log
			new Log( name + '.log'  , ( err , log ) => {
                console.log("Xasdasds");
                this._log = log;
                let logStream = log.toStream( );
                logStream.on('data', ( log ) => {
                    if( log ) {
                        log = JSON.parse( log );
                        if( log.verb == 'del' ) {
                            delete this._kv[ log.key ];
                        } else {
                            this._kv[ log.key ] = log;
                            //read the entry that the log refers to and add it to the local indexes in memory index
                            table.offset( log.offset , log.length , ( err , data ) => {
                                for( let index in this._indexes ) {
                                    if (data.hasOwnProperty(index)) {
                                        if( log.verb === 'put' ) {
                                            this._indexes[index].addToMemoryIndex(data[index], data[this._options.id], log.offset, log.length);
                                        } else if( log.verb == 'del' ) {
                                            this._indexes[index].removeFromMemoryIndex(data[this._options.id]);
                                        }
                                    }
                                }
                            });
 
                        }
                    }
                });
                logStream.on('error' , ( err ) => {
                   console.log( "ERROR" , err );
                });
                logStream.on('end', () => {
                    //after we finish parsing the log we say that the db is loaded

                   // console.log( this._indexes[ this._options.id ].toStream() );
                    cb( null , this );
                });

			});
		});

       // console.log( this._log );
		
	}

	put( doc , cb ) {

		this._put( doc , cb );
	}

    _put( doc , cb ) {
        this._store.write( doc , ( err , e ) => {
            //create an id if it doesn't exist
            if( !e.object.hasOwnProperty(this._options.id)) {
                e.object[ this._options.id ] = Guid.create().toString();
            }

            let putObject = { offset : e.offset , length : e.length, key : e.object[ this._options.id ] , verb : 'put' }
            this._log.write( JSON.stringify( putObject ) , ( err ) => {
                
                for( let index in this._indexes ) {
                    if (e.object.hasOwnProperty(index)) {
                        this._indexes[index].addToMemoryIndex(e.object[index], e.object[this._options.id], e.offset, e.length);
                    }
                }
                return cb();
            } );
        } ) ;
    }

	compact( cb ) {
		var old_log = this._log;
        console.log( "compacting db" );
        let _indexCache = [ ];
        async.series( [
            ( callback ) => {
                //replace the current log with a new one so that we cna still keep accepting transactions
                this._log = new Log( this.name + '~.log', callback);
            },
            ( callback ) => {
                //create a new table to merge to
                new SSTable( this.name + '~.sst' , this._options , callback);
            },

            //create new temp indexes to write to
            ( callback ) => { this.createTempIndexes( callback  ) }


            ] , ( err , results ) => {
                this._log = results[ 0 ];
                let sstable = results[ 1 ];
                let newIndexes = results[2];

              // sstable.on("RecordAdded" , ( offset , data ) => {
               //    _indexCache.push( { offset , data }); //todo move to a streamed model
                //});
            sstable.mergeLog( this._sstable , old_log , ( e) => {
                let oldSSTable = this._sstable;
                this._sstable = sstable;
                oldSSTable.close();
                fs.unlink( this.name + '.sst' , ( ) => fs.rename( this.name + '~.sst' , this.name + '.sst' ) );
                old_log.close();
                fs.unlink( this.name + '.log' , ( ) => fs.rename( this.name + '~.log' , this.name + '.log' ) );

                for( let index in newIndexes ) {
                    let listOfIndexes = [ ];
                    for( let data of _indexCache) {
                        if( data.data.hasOwnProperty( index ) ) {
                            listOfIndexes.push( { key : data.data[ index ] , offset : data.offset } );
                        }
                    }
                    newIndexes[ index ].writeFromArray( listOfIndexes  , ( ) => { });
                }

                this.replaceIndexWithTemp(newIndexes , cb);
            });

        } , ( ) => {
            cb();
            console.log( "WHY IS THIS NOT FIRING?");
        });

	}

    replaceIndexWithTemp( newIndexes ,cb ) {
        async.eachSeries( Object.keys( this._indexes ) , ( item , callback) => {
            fs.unlink( this.name + '.' + item + '.index' , ( ) => fs.rename( this.name + '.' + item + '~.index' , this.name + '.' + item + '.index' , callback ) );

        } , ( ) => {
            this._indexes = newIndexes;
          
            //cb( null  );
        });
    }

    createTempIndexes( cb ) {
        var new_indexes = { };
        async.eachSeries( Object.keys( this._indexes ) , function iteratee( item , callback) {
            new FastIndex( this.name + '.' + item + '~.index' , ( err , fast_index ) => {
                new_indexes[ item ] = fast_index;
                callback();
            });

        }.bind( this ) , function done( ) {
            cb( null , new_indexes )
        });
    }

	where( key_name , equals , cb ) {
        let results = [ ];


		if( this._indexes.hasOwnProperty( key_name ) ) {
			this._indexes[ key_name ].seekAll(  equals , ( err , data ) => {

                async.eachSeries( data , ( item , cb ) => {

                    this._store.offset( item.offset , item.length , ( err  , value ) => {

                        results.push( value );
                        cb();
                    } );
                } , ( ) => {
                    cb( null , results);
                });

            } );
		} else {
            //do a scan
        }
	}

	createIndex( name , cb ) {
		this._indexes[ name ] = new FastIndex( this.name + '.' + name + '.index' , cb );
	}

    saveIndexes( cb ) {
        this._indexes[ this._options.id ].save();
    }
}

module.exports = Table;