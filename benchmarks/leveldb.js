/**
 * Created by ryanmccarvill on 13/06/16.
 */

var assert = require("assert");

var async = require('async');



var levelup = require('levelup');

var db = levelup('./leveldb');


let doInsert = true;
let count = 0;
let inserted = [ ];

function insert( ) {
    count++;
    if( doInsert) {
        let key = Math.random( );
        inserted.push( key );
        db.put( key , key , insert );
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

            db.get( inserted.pop() , ( err , value ) => {
                if (err ) console.log( err );
                process.nextTick( ( ) => { _get();} );
                count++;

            });


        }
    }

    _get();

}