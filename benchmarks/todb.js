/**
 * Created by ryanmccarvill on 13/06/16.
 */

var assert = require("assert");
var DB = require('../index.js');
var async = require('async');

var inserted = [ ];
//describe( "Benchmark inserts and query" , ( ) => {

  //  it( "insertion benchmark" , ( done ) => {

        new DB('___').then(db => db.table('benchmark', {id: 'num'}))
           // .then(table => table.createIndex('num2'))
            .then(table => {
                let doInsert = true;
                let count = 0;
                setTimeout( ( ) => {
                    console.log( count + ' records inserted in 3 seconds' );
                    doInsert = false;
                    benchMarkGet( table );
                } , 3000 );

                function insert( ) {
                    count++;
                    if( doInsert ) {
                        let key = Math.random();
                        inserted.push( key );
                        table.put({num: key, num2: key} , insert );

                    }
                }
                insert();

            });


function benchMarkGet( table ) {

            let doGet = true;
            let count = 0;
            setTimeout( ( ) => {
                console.log( count + ' records loaded in 3 seconds' );
                doGet = false;
            } , 3000 );

            function get( ) {

                if( doGet ) {
                    table.where("num" , inserted.pop() , ( err , results ) => {
                        count++;
                       // console.log( inserted.length );
                        //if( !results[ 0 ].hasOwnProperty( 'age' ) ) {
                         //   console.log( "ERROR" );
                        //}
                        get();
                    } );

                }
            }
            get();


}


//    });

//} );
