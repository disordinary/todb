var assert = require("assert");
var DB = require('../index.src.js');

function runByOne(generatorFunction) {
    var generatorItr = generatorFunction(resume);
    function resume( err , value ) {
        generatorItr.next(  err || value  );
    }
    generatorItr.next()
}



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