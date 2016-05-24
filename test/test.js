var assert = require("assert");
var DB = require('../index.src.js');

function runByOne(generatorFunction) {
    var generatorItr = generatorFunction(resume);
    function resume( err , value ) {
        generatorItr.next(  err || value  );
    }
    generatorItr.next()
}

let testData = [
	{ email : 'zryan@place.com' , age : '34' , name : 'Ryan' , sex : 'm' },
	{ email : 'zchantelle@place.com' , age : '26' , name : 'Chantelle' , sex : 'f' },
	{ email : 'znikki@place.com' , age : '37' , name : 'Nikki' , sex : 'f' },
	{ email : 'zjim@place.com' , age : '22' , name : 'Jim'  , sex : 'm' },
	{ email : 'zsarah@place.com' , age : '19' , name : 'Sarah' , sex : 'f' },
	{ email : 'zanne@place.com' , age : '32' , name : 'Anne' , sex : 'f' },
	{ email : 'zfrank@place.com' , age : '56' , name : 'Frank' , sex : 'm' },
	{ email : 'zthomas@place.com' , age : '24' , name : 'Thomas' , sex : 'm' },
	{ email : 'zclaire@place.com' , age : '60' , name : 'Claire' , sex : 'f' },
	{ email : 'zsam@place.com' , age : '24' , name : 'Sam' , sex : 'm' }
]



var db = new DB( '_' , ( err , db ) => {
	db.createTable("people" , { id : 'email' } ,( err , table) => {
		console.log("X");
		runByOne(function* myDelayedMessages(next) {
				table.createIndex( "name" , ( ) => { } );
				table.createIndex( "sex" , ( ) => { } );
				for( test of testData ) {
					yield table.put( test , next );
				}

				table.compact( ( ) => {
                    "use strict";
                    table.where("sex" , 'f' , ( ) => {

                    } );
                } );
			} );
	} );
});

/*
	let tests =  {
				foo : 'bah',
				'ra' : 'cat', 
				'isis' : 'cat',
				'json?' : { 'yes' : 'iam' },
				1 : 2,
				'date' : new Date()
			};


describe( "todb insertion and retrieval test" , ( ) => {
	it( "an insert should be the same as a retrieval" , ( done ) => {
			let tests =  {
				foo : 'bah',
				'ra' : 'cat', 
				'isis' : 'cat',
				'json?' : { 'yes' : 'iam' },
				1 : 2,
				'date' : new Date()
			};
		var db = new DB("./_test.db" , ( err , db ) => {
	
			let test_return = [ ];
			runByOne(function* myDelayedMessages(next) {
				for( test in tests ) {
					yield db.put( test , tests[ test ] , next );
				}
				done();
				
			});
		});

		//close and re-open to reinitialize the cache

		var db = new DB("./_test.db" , ( err , db ) => {
	//		runByOne(function* myDelayedMessages(next) {
	//			for( test in tests ) {
	//				yield db.get( test , next );
	//			}
				done();
				
			});
			
		});
	});
});

/*
describe( "todb insertion and retrieval test" , ( ) => {
	it( "an insert should be the same as a retrieval" , ( done ) => {
		var db = new DB("./_test.db" , ( err , db ) => {
			db.put( "RA" , "CAT" , ( err ) => {
				
				 db.get( "RA" , ( err , value ) => {
					assert.equal( "CAT" , value );
					done();
				} );
			});

			db.put( "FOO" , "BAH" , ( err ) => {
				
				 db.del( "FOO" , ( err , value ) => {
					//assert.equal( "CAT" , value );
					//done();
				} );
			});
			//db.close();
		});
	})
		
});
*/
/*
var db = new DB("./_test.db" , ( err , db ) => {
	//console.log( err , db );
			db.get( "RA" , ( err , data ) => {
				console.log( err , data );
			});
});
*/