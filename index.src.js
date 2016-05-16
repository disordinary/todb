var fs = require( 'fs' );
const chunk_size = 512; //size in bytes of a chunk of db
const max_doc_size = 8; //max doc (key value pair) size of 9.99 MB
const byte_size_pad = Array(max_doc_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s



class Todb {
	constructor( path_to_db , cb ) {
		this.path = path_to_db;
		this.queue = [ ]; 
		this._kv = { };
		this._db_fd;
		this._logs_fd;
		this._logs_fd_size;
		this.locked = true;
		
		this._loadDatabase( ( err ) => {
			this._loadLogs( ( err ) => {
				cb( err , this );
			} );
		});

	}

	_loadDatabase( cb ) {
		cb();
	}

	_loadLogs( cb ) {
		this.locked = true;
		if (!fs.existsSync(this.path)){
		    fs.mkdirSync(this.path);
		}
		fs.stat(  this.path + '/log' , ( err , stats ) => {
			if( err && err.code == 'ENOENT' ) {
				this._logs_fd_size = 0;
			} else {
				this._logs_fd_size = stats.size;
			}
			
			fs.open( this.path + '/log' , 'a+' , ( err , fd ) => {
				this._logs_fd = fd;
				
				//load log into memory
				this._logReadRecord( this._logs_fd , 0 , ( err , record , offset ) => {
					//console.log( record.toString() );
						cb();
					} );
				});

				this.locked = false;
			} );
		
	}
	_logReadRecord( fd , start , cb ) {
		if( start === this._logs_fd_size ) {
			return cb( );
		}
		this._read( fd , start , max_doc_size -1  , 
				( err , offset , buffer ) => { 
					this._read( fd , offset , +buffer.toString( ) , 
						( err , offset , buf ) => {
							//cb( err , buf , offset );
							//console.log( buf.toString());
							let record = JSON.parse( buf );
							switch( record.verb ) {
								case "put":
									this._kv[ record.key ] = record.value;
								break;
								default:
									delete this._kv[ record.key ];
								break;
							}
							this._logReadRecord( fd , offset , cb );
						})
				} );
	}
	_read( fd , start , length , cb ) {
		
		var buf = new Buffer( length );
		
		fs.read( fd , buf , 0 , length , start , ( err , bytesRead , buffer ) => {
			cb( err , start  + length , buffer );
		});
		
	}
	_processQueues( ) {
		
		if( this.locked || this.queue.length === 0 ) return;
		
		this.locked = true;
		let item = this.queue[ 0 ];


		//if item is succesfully written to disk:
		var doc = JSON.stringify( item );
		var bytes = pad( byte_size_pad , Buffer.byteLength( doc ));

        var output = new Buffer(bytes + doc);
      
        fs.write(this._logs_fd, output , 0 , output.byteLength , ( err ) => {
        	
			//two verbs, put and delete
			if( item.verb === "put" ) {
				this._kv[ item.key ] = item.value;
			} else {
				delete this._kv[ item.key ];
			}

			this._logs_fd_size += output.byteLength;

        	item.cb( err );
        });
		this.queue.shift( );
		this.locked = false;

	}


	get locked( ) {
		return this._locked;
	}

	set locked( value ) {
		if( value === false ) {
			//when we unlock we immediately process the queue
			process.nextTick( this._processQueues.bind( this ) );
			
		}
		this._locked = value;
	}

	put( key , value , cb ) {
		this.queue.push( { key , value , verb : 'put' , cb } );
		process.nextTick( this._processQueues.bind( this ) );
	}

	get( key , cb ) {
		var val = this._kv[ key ];
		if( val ) {
			return cb( null , val );
		}
		//query made db
	}

	del( key , cb ) {
		this.queue.push( { key  , verb : 'del' , cb } );
		process.nextTick( this._processQueues.bind( this ) );
	}

	close( ) {
		//closes the db
		fs.close( this._logs_fd );
		//fs.close( this._db_fd );
	}

}

function pad(pad, str) {
    return (pad + str).slice(-pad.length);
}


module.exports = Todb;