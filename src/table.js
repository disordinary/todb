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
	constructor( name , options , configObject , cb ) {

		this._options = Object.assign( { } , default_options , options || { } );
		this.name = name;
		this._kv = { }; //logs are kept in memory
        this._indexes = { };
        this._config = configObject;

        this._config[ this.name ] = true;


        this.createIndex( this._options.id );

		this._store = new ATable( name + '.at' , ( err , table ) => {

            //load from the log
			new Log( name + '.log'  , ( err , log ) => {

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
                                            this._indexes[index].addToMemoryIndex(data[index], data[this._options.id],  log.offset, log.length);
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

        let promise = new Promise( ( resolve , reject ) => {
            this._put(doc, ( err ) => {

                if ( cb && typeof cb == 'function' ) {
                    cb( null );
                } else {

                    resolve( this );
                }
            });
        } );

        if (!cb || typeof cb != 'function') {
            return promise;
        }

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

                cb();

            } );
        } ) ;
    }



	where( key_name , equals , cb ) {
        let results = [ ];

        let promise = new Promise( ( resolve , reject ) => {

            if (this._indexes.hasOwnProperty(key_name)) {
                this._indexes[key_name].seekAll(equals, (err, data) => {

                    async.eachSeries(data, (item, next) => {

                        this._store.offset(item.offset, item.length, (err, value) => {
                            results.push(value);
                            next();
                        });
                    }, () => {

                        if ( cb && typeof cb == 'function' ) {
                            cb( null , results );
                        } else {

                            resolve( results );
                        }
                    });

                });
            } else {
                //do a scan
            }
        } );
        if (!cb || typeof cb != 'function') {

            return promise;
        }
	}

	createIndex( name , cb ) {
        this._config[ this.name + ":" + name ] = true;
        let promise = new Promise( ( resolve , reject ) => {
            this._indexes[name] = new FastIndex(this.name + '.' + name + '.index', this._options.id, ( err ) => {
                if ( cb && typeof cb == 'function' ) {
                    cb( null );
                } else {
                    resolve( this );
                }
            });
        } );

        if (!cb || typeof cb != 'function') {
            return promise;
        }
	}

    saveIndexes( cb ) {
        this._indexes[ this._options.id ].save();
    }
}

module.exports = Table;