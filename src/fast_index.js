
const max_doc_size = 8; //max doc (key value pair) size of 9.99 MB theoretically the key could make up the entirety
const doc_size_pad = Array(max_doc_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s

const version = 1;
const max_table_size = 10; //max table size is aprox 1 GB
const table_size_pad = Array(max_table_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s

const content_seperator = String.fromCharCode(2); //start of text ascii

const record_seperator = String.fromCharCode(30); //record seperator ascii


var fs = require('fs');

var stream = require('stream');

var async = require("async");

var split = require('split');

/**
 * A fast index is similar to an SSTable except it only stores a string and the byte offset of the object
 * It still has the contents lookup table at the end, but will be replaced by a b-tree.
 * @class SSTable
 */
class FastIndex {

	constructor( path , cb ) {
		
		this._fd = null; 						//the file discriptor for this table
		this._path = path;				//the path and filename for this table
		this._size = 0;					//the size of this table

		this._contentsStart = 0; 		//the offset for the end of the main data / the start of the table of contents
		this._contents = { }; 			//the first offset of the first character of a key, called the table of contents

        this._memoryIndex = { };        //an in memory index
        this._memoryDelKeys = { };
        this._unique = true;            //enfoce unique by overwriting new records with old
		//Load the table
		this._load( cb );
	}

	_load( cb ) {
		//Load the table
		if ( !fs.existsSync( this._path ) ){
			
			try {
				this._fd = fs.openSync( this._path , 'w+' );

			} catch( e ) {

				return cb( e );
			}
			this._writeHeaderPlaceHolderSync( );   
		    cb( null , this );
		
		} else {
		
	
			this._size = fs.statSync( this._path ).size;
			try {
				this._fd = fs.openSync( this._path , 'r' );

			} catch( e ) {
				return cb( e );
			} 
			this._loadHeaderInfoSync( );
			
			//if this table is not empty then load the contents
			if( this._contentsStart > max_table_size + 2 ) {
				this._loadTableOfContents( ( err ) => {
					cb( err , this );
				} );
			} else {
				cb( null , this );
			}

		}
	}

    addToMemoryIndex( value , key , offset , length ) {
        if( !this._memoryIndex.hasOwnProperty( value ) ) {
            this._memoryIndex[ value ] = [ ];
        }
        this._memoryIndex[ value ].push( { key , offset , length} );
        delete this._memoryDelKeys[ key ];
    }
    removeFromMemoryIndex( key ) {
        this._memoryDelKeys[ key ] = true;
    }
	writeFromArray( array_of_strings , cb ) {

		//sorts based on key, right now the key HAS TO EXIST.
		array_of_strings.sort( ( a , b ) => {


			if( a.key < b.key ) {
				return -1;
			}
			if( a.key > b.key ) {
				return 1;
			}
			return 0;
		}  );


		var write_size = 0; //the size of the combined dataset, this is used to place the table of contents.

		
		this._write_from_sorted_array( array_of_strings , ( err ) => {

			//finish writing by placing table of contents at the bottom of the document
			let buffer = new Buffer( JSON.stringify( this._contents ) );
			 fs.write(this._fd, buffer , 0 , buffer.byteLength , this._size , ( err ) => {
				//and the position of the table of contents in the header
			 	let buffer = new Buffer( pad( table_size_pad , this._size ) );
			 	fs.write(this._fd, buffer , 0 , buffer.byteLength , 2, ( err ) => {
			 		this.writable = false;
			 		cb( err );
			 	});
			 	
			 });
			
		} );
		
	

	}



	_write_from_sorted_array( an_array_of_documents , cb ) {
		if( an_array_of_documents.length < 1 ) {
			cb( );
			return;
		}

	
			let data = an_array_of_documents.shift();
			

			let key = "";
			key = data.key;


			
			//create information for content file
			if( !this._contents.hasOwnProperty( key[ 0 ] ) ) {
				this._contents[ key[ 0 ] ] = this._size;
			}
			


			var buffer = this._create_record(  data );//new Buffer( bytes + kv_pair );	

			 fs.write(this._fd, buffer , 0 , buffer.byteLength , this._size , ( err ) => {

				this._size += buffer.byteLength;
				this._write_from_sorted_array(  an_array_of_documents , cb );

			 });

	}

	_create_record( value , key , offset , length ) {
		//a record is length_of_key_in_bytes|key|offset_in_document_in_bytes
		//var bytes = pad( doc_size_pad , Buffer.byteLength( data.key ));
        offset = pad( doc_size_pad , offset );
        length = pad( doc_size_pad , length );

		return new Buffer( value + content_seperator + key + content_seperator + offset + content_seperator + length  + record_seperator );
	}


	_loadTableOfContents( cb ){
		var length = this._size - this._contentsStart;
		var buf = new Buffer( length );
		
		fs.read( this._fd , buf , 0 , length , this._contentsStart , ( err , bytesRead , buffer ) => {
			this._contents = JSON.parse( buffer );
            console.log( "TAble of contents" , this._contents );
			cb( err  );
		});
	}

	/**
	 * Writes the header placeholder into the open file. The header consists of a version number
	 * and the offset of the table of contents
	 * @private
	 */
	_writeHeaderPlaceHolderSync( ) {
		//first 2 bytes is version information
		fs.writeSync(this._fd, pad( "00" , version ) , 0 , 2 );
		//next 10 bytes is the end of the data / access to the quick lookup information.
		fs.writeSync(this._fd, table_size_pad , 2 , max_table_size );
		this._size += max_table_size + 2;
		//The quick lookup information is a list of all the first characters in the SSTable and an offset of where to find them.
	}
	/**
	 * loads the header info into memory
	 * @private
	 */
	_loadHeaderInfoSync( ) {
		var versionBuffer = new Buffer( 2 );
		fs.readSync( this._fd , versionBuffer , 0 , 2 , 0 );
		console.log( `Loading index, version: ${versionBuffer.toString()}` );
		this._version = parseInt( versionBuffer );

		var offsetBuffer = new Buffer( max_table_size );
		fs.readSync( this._fd , offsetBuffer , 0 , max_table_size , 2 );
	
		this._contentsStart = parseInt( offsetBuffer );
		
	}


	seekAll(  key , cb ) {
        var results = [ ];

        //..load from disk first..\\
        if( this._memoryIndex.hasOwnProperty( key ) ) {

            for (var i = 0; i < this._memoryIndex[key].length; i++) {
                results.push( this._memoryIndex[ key ][ i ] );
                //if( this._memoryIndex[key][ i ].verb === 'put' ) {
                //    results[ key ] = this._memoryIndex[ key ][ i ];
                //} else if( this._memoryIndex[key][ i ].verb === 'del' ) {
                //    delete results[ key ];
                //}
            }
        }

        cb( null , results );
      /*  let start = this._contents[ key[ 0 ] ];
        let end;
        for( let k in this._contents ) {
            if( k > key ) {
                end = this._contents[ k ];
                break;
            }
        }
        if( !end ) {
            end = this._contentsStart;
        }
        let length = end - start;
        var buf = new Buffer( length );

        fs.read( this._fd , buf , 0 , length , start , ( err , bytesRead , buffer ) => {
            let records = buffer.toString().split(record_seperator);
            let returnAr =  [ ];
            for(let record of records ) {
                let rec = record.split( start_content_seperator );
                if( rec[0] == key ) {
                    returnAr.push(parseInt(rec[1]));
                }
              //
            }
            cb( null , returnAr );
            //cb(err, start + length, buffer);

        });*/
        //this._seekAll( this._contents[ key[ 0 ] ] , key , [ ] , cb);


	}

    /**
	 * a public API for _readItem
	 * @async
	 */
	offset( offset , cb ) {
		this._readItem( offset , cb );
	}
    diskToStream( ) {
        var s = fs.createReadStream(this._path , { start : max_table_size + 2 } ); //{ fd : this._fd } doesn't work
        return s.pipe( split( record_seperator ));
    }

    olddiskToStream( ) {
        let rs = stream.Readable();
        let this_offset = max_table_size + 2;
        let contents = Object.keys( this._contents );
        contents.sort();
        console.log( contents );

        for( let i = 0; i < contents.length; i++ ) {

            console.log( this._contents[ contents[ i ] ] );
        }
        return;
        rs._read = function () {

            if( this_offset >= this._contentsStart ) {
                return rs.push( null );
            }
            this.offset( this_offset , ( err , end_offset , data ) => {
                this_offset = end_offset;
                rs.push( data );
            });
        }.bind( this );
        return rs;
    }

    save( callbackMain ) {
        //merges the in memory index with the current one
        var items = { };
        let stream = this.diskToStream( );
        stream.on('data', ( item ) => {
            //      this._memoryDelKeys[ key ]
            if( item ) {

                item = item.split(content_seperator);
                if( !this._memoryDelKeys.hasOwnProperty( item[ 1 ] ) ) {
                    items[item[0]] = {key: item[1], offset: item[2], length: item[3]}
                }
            }
        } );
        stream.on('end' , ( err ) => {

            new FastIndex( this._path + '~' , ( error , fi ) => {
                let mi = Object.keys( this._memoryIndex ).sort();
                async.eachSeries( mi , ( memIndex , callback) => {
                    async.eachSeries( this._memoryIndex[ memIndex ] , ( item , cb ) => {
                        if( !this._memoryDelKeys.hasOwnProperty( item.key ) ) {
                            items[memIndex] = item;
                        }

                        console.log( items );

                    } , callback );
                } , callbackMain );
            });
        });



    }

    add( key , buffer , cb ) {
        if( !this._contents.hasOwnProperty( key[ 0 ] ) ) {
            this._contents[ key[ 0 ] ] = this._size;
        }
        fs.write( this._fd , buffer , 0 , buffer.byteLength , this._size , ( err ) => {
            this._size += buffer.byteLength;
            cb( err );
        });
    }

	close( ) {
		fs.close( this._fd );
	}

}

module.exports = FastIndex;

function pad(pad, str) {
    return (pad + str).slice(-pad.length);
}
