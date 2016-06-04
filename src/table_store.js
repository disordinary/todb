

const max_doc_size = 8; //max doc (key value pair) size of 9.99 MB
const doc_size_pad = Array(max_doc_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s
const max_table_size = 10; //max table size is aprox 1 GB
const table_size_pad = Array(max_table_size).fill().reduce(prev => prev = (prev ||  "") + "0"); //the padding string for they bytes, 8 0s
const version = 1;
const start_content_seperator = String.fromCharCode(2); //start of text ascii
const start_heading_seperator = String.fromCharCode(1); //start of heading ascii
const record_seperator = String.fromCharCode(30); //record seperator ascii



var fs = require('fs');

var stream = require('stream');


class ATable {

	constructor( path , cb ) {
		

			
		this._fd; 						//the file discriptor for this table
		this._path = path;				//the path and filename for this table
		this._size = 0;					//the size of this table
		this._version = 1;				//the version of this table


		//Load the table
		this._load( cb );
	}

	_load( cb ) {

		//Load the table
		if ( !fs.existsSync( this._path ) ) {
			this._size = fs.statSync( this._path ).size;
		}
		try {
			this._fd = fs.openSync( this._path , 'a+' );
		} catch( e ) {
			return cb( e );
		}
		
		cb( null , this );

	}



	write( object , cb ) {
		let buffer = new Buffer( this._create_record( object ) );

		fs.write(this._fd, buffer , 0 , buffer.byteLength , this._size , ( err ) => {
			let event = { offset : this._size , length : buffer.byteLength , object };
			this._size += buffer.byteLength;
			cb( err , event )

		});
	}
	/**
	 * Creates a record object for writing
	 * @private
	 * @param  {Object}
	 * @return {Buffer}
	 */
	_create_record( doc ) {
	
		var data = JSON.stringify( doc ) + record_seperator;
		var bytes = pad( doc_size_pad , Buffer.byteLength( data ));
		return new Buffer( bytes + data );
	}




	/**
	 * reads bytes from the file and outputs a buffer
	 * @private
	 * @async
	 * @param  {int} the start byte
	 * @param  {int} the end byte
	 * @param  {Function( err , endLength , buffer ) } the end position of this record and a buffer of its contents
	 * @return {[type]}
	 */
	_read( start , length , cb ) {
		var buf = new Buffer( length );
		fs.read( this._fd , buf , 0 , length , start , ( err , bytesRead , buffer ) => {
			cb( err , start  + length , buffer );
		});
		
	}



	/**
	 * a public API for _readItem
	 * @async
	 */
	offset( offset , length , cb ) {
		this._read( offset , length , ( err , _ , data ) => {

			cb( err , JSON.parse( data.slice( max_doc_size - 1 , -1  ) ) );
		} );
	}

	/**
	 * returns a read stream of this table
	 */
	toStream( ) {	
			var rs = stream.Readable();
			let this_offset = max_table_size + 2;
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

	close( ) {
		fs.close( this._fd );
	}

}

module.exports = ATable;

function pad(pad, str) {
    return (pad + str).slice(-pad.length);
}
