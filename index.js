
var fs = require( 'fs' );
var Table = require('./src/table.js');
var config = require('./src/config.js');
class Todb {
	constructor( path_to_db , cb ) {

		this.path = path_to_db;
		this.config = config( path_to_db );
		if (!fs.existsSync(this.path)){
		    fs.mkdirSync(this.path);
		}
		this.tables = { };

		//return a promise if callback doesn't exist
		if( cb && typeof cb == 'function' ) {
			cb(null, this);
		} else {
			return new Promise( ( resolve , reject ) => {
				resolve( this );
			} );
		}

	}


	//creates or returns a table
	table( tableName , options , cb ) {
		let promise = new Promise( ( resolve , reject ) => {
			let table = new Table(this.path + "/" + tableName, options, this.config , (err, table) => {
				this.tables[ tableName ] = table;

				if ( cb && typeof cb == 'function' ) {
					cb( null, table );
				} else {
					resolve( table );
				}
			});
		} );
		if (!cb || typeof cb != 'function') {
			return promise;
		}

	}
	

}

function pad(pad, str) {
    return (pad + str).slice(-pad.length);
}


module.exports = Todb;




/*var fs = require( 'fs' );
var Logs = require('append-log');
class Todb {
	constructor( path_to_db , cb ) {
		this.path = path_to_db;
		if (!fs.existsSync(this.path)){
		    fs.mkdirSync(this.path);
		}
		this._kv = { };
		this._peiceTable;
		new Logs(path_to_db + '/change.log' , ( err , _logs ) => {
			this._logs = _logs;
			this.readFromLogs( cb );
		});


	}

	readFromLogs( cb ) {

				var read = this._logs.readStream();
				read.on('data' , ( log ) => {
					if( log ) {
						var log = JSON.parse( log );
						
						if( log.verb == 'del' ) {
							delete this._kv[ log.key ];
						} else {
							this._kv[ log.key ] = { value : log.value };
						}
					}
				});
				read.on('error' , ( error ) => {
					cb( error );
				});
				read.on('end' , ( ) => {
					cb( null , this );
				});
	}

	put( key , value , cb ) {
		let putObject = { key , value , verb : 'put' , cb } ;
		this._logs.write( JSON.stringify( putObject ) , ( err ) => {
			if( !err ) {
				this._kv[ key ] = putObject;
				return cb( )
			}
			cb( err );
		} );
	//	
	}

	get( key , cb ) {
		var val = this._kv[ key ].value;
		if( val ) {
			return cb( null , val );
		}
		cb( null , undefined );
		
	}

	del( key , cb ) {
		let putObject = { key , verb : 'del' , cb } ;
		this._logs.write( JSON.stringify( putObject ) , ( err ) => {
			if( !err ) {
				this._kv[ key ] = putObject;
			}
			putObject.cb( err );
		} );
	}

	close( ) {
		//closes the db
		//fs.close( this._logs_fd );
		//fs.close( this._db_fd );
	}

}

function pad(pad, str) {
    return (pad + str).slice(-pad.length);
}


module.exports = Todb;*/