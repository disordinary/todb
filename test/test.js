var assert = require("assert");
var DB = require('../index.js');
var async = require('async');


function runByOne(generatorFunction) {
    var generatorItr = generatorFunction(resume);
    function resume( err , value ) {
        generatorItr.next(  err || value  );
    }
    generatorItr.next()
}

let testData = [
	{ email : 'ryan@place.com' , age : '33' , name : 'Ryan' , sex : 'm' },
	{ email : 'chantelle@place.com' , age : '26' , name : 'Chantelle' , sex : 'f' },
	{ email : 'nikki@place.com' , age : '37' , name : 'Nikki' , sex : 'f' },
	{ email : 'jim@place.com' , age : '33' , name : 'Jim'  , sex : 'm' },
	{ email : 'sarah@place.com' , age : '18' , name : 'Sarah' , sex : 'f' },
	{ email : 'anne@place.com' , age : '32' , name : 'Anne' , sex : 'f' },
	{ email : 'frank@place.com' , age : '56' , name : 'Frank' , sex : 'm' },
	{ email : 'thomas@place.com' , age : '24' , name : 'Thomas' , sex : 'm' },
	{ email : 'claire@place.com' , age : '33' , name : 'Claire' , sex : 'f' },
	{ email : 'sam@place.com' , age : '24' , name : 'Sam' , sex : 'm' }
];



describe( "Create, populate, and query database using cb's " ,  ( ) => {

	it( "database should create, populate and get query" , ( done ) => {
			new DB('_', (err, db) => {

				db.table("people", {id: 'email'}, (err, table) => {
					table.createIndex('age', () => {
						async.eachSeries(testData, (item, next) => {
							table.put(item, () => next());
						}, () => {
							table.where('email', 'ryan@place.com', (_, results) => {
								assert.equal( results[ 0 ].email , 'ryan@place.com' );
								table.where('age', '33', (_, results) => {
									assert.equal( results.length , 3 );
									assert.equal( results[ 0 ].name , 'Ryan' );
									assert.equal( results[ 1 ].age , 33 );
									assert.equal( results[ 2 ].sex , 'f' );

									done();
								});
							});

						});
					});
				});
			});
		});
} );

describe( "Create, populate, and query database using promises" , ( ) => {

	it( "database should create, populate and get query" , ( done ) => {

		new DB('__').then(db => db.table('people', {id: 'email'}))
			.then(table => table.createIndex('age'))
			.then(table => {
				let promise = new Promise( ( resolve , reject ) => {
					let populatePromise = [];
					testData.map(data => populatePromise.push(new Promise((resolve, reject) => {
						table.put(data);
						resolve();
					})));

					return Promise.all(populatePromise).then( _ => resolve( table ) );

				});

				return promise;
			})
			.then(table => table.where('age', '33'))
			.then(results => {

				assert.equal( results.length , 3 );
				assert.equal( results[ 0 ].name , 'Ryan' );
				assert.equal( results[ 1 ].age , 33 );
				assert.equal( results[ 2 ].sex , 'f' );

				done();
			});

	});

} );

