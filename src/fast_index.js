
const max_doc_size = 8; //max doc (key value pair) size of 9.99 MB theoretically the key could make up the entirety
const doc_size_pad = Array(max_doc_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s

const version = 1;
const max_table_size = 10; //max table size is aprox 1 GB
const table_size_pad = Array(max_table_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s


var fs = require('fs');

var stream = require('stream');

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

	_create_record( data ) {
		//a record is length_of_key_in_bytes|key|offset_in_document_in_bytes
		var bytes = pad( doc_size_pad , Buffer.byteLength( data.key ));
		var offset = pad( doc_size_pad , data.offset );
		return new Buffer( bytes + data.key + offset );
	}


	_loadTableOfContents( cb ){
		var length = this._size - this._contentsStart;
		var buf = new Buffer( length );
		
		fs.read( this._fd , buf , 0 , length , this._contentsStart , ( err , bytesRead , buffer ) => {
			this._contents = JSON.parse( buffer );

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
		console.log( `Loading table, version: ${versionBuffer.toString()}` );
		this._version = parseInt( versionBuffer );

		var offsetBuffer = new Buffer( max_table_size );
		fs.readSync( this._fd , offsetBuffer , 0 , max_table_size , 2 );
	
		this._contentsStart = parseInt( offsetBuffer );
		
	}

	/**
	 * Reads a record from a startign offset
	 * @private
	 * @async
	 * @param  {int} start the offset of the record in the file
	 * @param  {Function} cb the offset of the end of this record and a buffer of this record
	 */
	_readItem( start , cb ) {

		this._read( start , max_doc_size -1 ,
				( err , offset , buffer ) => {

					this._read( offset , parseInt( buffer ) ,
                        ( err , offset , key ) => {
                            this._read( offset , max_doc_size - 1 , ( err , offset , value) => {
                                cb( err , offset , { key : key.toString() , value : parseInt( value ) } );
                            })
                        } );
				} );
	}


	_read( start , length , cb ) {
		var buf = new Buffer( length );

		fs.read( this._fd , buf , 0 , length , start , ( err , bytesRead , buffer ) => {

                cb(err, start + length, buffer);

		});
		
	}

	seekAll(  key , cb ) {

        this._seekAll( this._contents[ key[ 0 ] ] , key , [ ] , cb);


	}


	_seekAll( offset , key , results , cb ) {
        this._readItem( offset , ( err , offset , data ) => {

            let doc =  data;
            console.log( doc.key , key , doc);
            if( doc.key === key ) {
               results.push( doc.value );
            } else if( doc.key > key || offset >= this._contentsStart ) {
               return  cb( null , results );
            }

            this._seekAll(offset, key, results, cb);

        } );
    }

	_seek( offset , key , cb ) {

		this._readItem( offset , ( err , offset , data ) => {

			let doc =  data.toString();

			if( doc === key ) {
				return cb( null , doc );
			}
			this._seek( offset , key , cb  );
		} );
	}

	/**
	 * a public API for _readItem
	 * @async
	 */
	offset( offset , cb ) {
		this._readItem( offset , cb );
	}
	

	close( ) {
		fs.close( this._fd );
	}

}

module.exports = FastIndex;

function pad(pad, str) {
    return (pad + str).slice(-pad.length);
}
