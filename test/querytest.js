/**
 * Created by ryanmccarvill on 13/06/16.
 */


function test( value ) {
    return new Promise( ( resolve , reject ) => {
        resolve( value );
    } );

}


test( "T" ).then( val ).then( val  ).then( val => console.log(val ));