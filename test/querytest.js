var assert = require("assert");
var DB = require('../index.js');
var async = require('async');


var db;

//describe( "test " , ( ) => {
  //  it( "should load db" , ( done ) => {
        new DB( "__" , ( err,  _db ) => {
            db = _db;
  //          done( );

            db.query.table( 'person' ).get( 'age' , '34' ).get( 'email' , 'ryan@something.com' ).filterIndex( 'age' , item => item === "34" ).all( ( err , data ) => console.log( data ) );
        } );
    //} );
    
    //it( "should query" , ( done ) => {
    //    db.query.table( 'person' ).get( 'age' , '34' ).get( 'email' , 'ryan@something.com' ).filterIndex( 'age' , item => item === "34" ).all( ( err , data ) => console.log( data ) );

//    } )
//} );