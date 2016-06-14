
var assert = require("assert");

var async = require('async');



var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('test.sqlite');
db.run("CREATE TABLE store ("
    + "key VARCHAR(25) NOT NULL, value VARCHAR(25) NOT NULL,"
    + "PRIMARY KEY (key))" , ( err ) => {console.log("err", err)});


let doInsert = true;
let count = 0;
let inserted = [ ];

function insert( ) {
    count++;
    if( doInsert) {
        let key = Math.random( );
        inserted.push( key );
        db.run("INSERT INTO store (key , value) VALUES (" + key + ", " + key + ")" , insert);
    }
}

setTimeout( ( ) => {
    console.log( count + ' records inserted in 3 seconds' );
    doInsert = false;
    benchmarkGet( );
} , 3000 );

insert();

let doGet = true;

function benchmarkGet( ) {

    let count = 0;
    setTimeout( ( ) => {
        console.log( count + ' records loaded in 3 seconds' );
        doGet = false;
    } , 3000 );

    function _get( ) {

        if( doGet ) {

            db.all("SELECT * FROM store WHERE key = " + inserted.pop(), function(err, row) {

                //console.log( row );
                count++;
                _get();
            });

        /*    db.get( inserted.pop() , ( err , value ) => {
                if (err ) console.log( err );
                process.nextTick( ( ) => { _get();} );
                count++;

            });*/


        }
    }

    _get();

}

