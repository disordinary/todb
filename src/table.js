var async = require("async");


var Log = require('/Users/ryanmccarvill/Projects/append-log/index.src.js');
var SSTable = require('/Users/ryanmccarvill/Projects/SSTable/index.js');
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

		this._sstable = new SSTable( name + '.sst' , this._options , ( err , table ) => {
			this._log = new Log( name + '.log'  , ( err , log ) => {
				console.log( "LOG" );
				cb( null , this );
			});
		});
		this._indexes = { };
        
		this.createIndex( this._options.id , ( _ ) => { console.log(""); })
		
	}

	put( doc , cb ) {
		
		let key = doc[ this._options.id ];
		let putObject = { doc , verb : 'put' , cb } ;
		this._log.write( JSON.stringify( putObject ) , ( err ) => {
			if( !err ) {
				this._kv[ key ] = putObject;
				return cb( )
			}
			cb( err );
		} );
	}

	compact( cb ) {
		var old_log = this._log;

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

               sstable.on("RecordAdded" , ( offset , data ) => {
                   _indexCache.push( { offset , data }); //todo move to a streamed model
                });
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

                this.replaceIndexWithTemp(newIndexes , ()=>{});
            });

        } );

	}

    replaceIndexWithTemp( newIndexes ,cb ) {
        async.eachSeries( Object.keys( this._indexes ) , ( item , callback) => {
            fs.unlink( this.name + '.' + item + '.index' , ( ) => fs.rename( this.name + '.' + item + '~.index' , this.name + '.' + item + '.index' , callback ) );

        } , ( ) => {
            this._indexes = newIndexes;
            cb( null  );
        });
    }

    createTempIndexes( cb ) {
        var new_indexes = { };
        async.eachSeries( Object.keys( this._indexes ) , function iteratee( item , callback) {
            new FastIndex( this.name + '.' + item + '~.index' , ( err , fast_index ) => {
                new_indexes[ item ] = fast_index;
                callback();
            });
            //console.log(new_indexes,"y")
        }.bind( this ) , function done( ) {
            cb( null , new_indexes )
        });
    }

	where( key_name , equals , cb ) {
		if( this._indexes.hasOwnProperty( key_name ) ) {
			this._indexes[ key_name ].seekAll(  equals , cb );
		} else {
            //do a scan
        }
	}

	createIndex( name , cb ) {
		this._indexes[ name ] = new FastIndex( this.name + '.' + name + '.index' , cb );
	}
}

module.exports = Table;