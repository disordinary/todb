//The db config object
//it's a proxy, if a setting changes the json object is saved
var fs = require( 'fs' );

let locked = false;
let pendingSave = false;
let loc;
let handler = {
    set : function( target , key , value ) {

        if( target[ key ] !== value ) {

            target[ key ] = value;
            //save json file
            if( !locked ) {
                write( target );
            } else {
                pendingSave = true;
            }

        }

        return true;

    },

    get : function( target , name ) {
        return target.hasOwnProperty( name ) ? target[ name ] : undefined;

    }
};

function write( target ) {
    pendingSave = false;
    locked = true;
    fs.writeFile(loc + '/config.json', JSON.stringify( target ), (err) => {
        if( err ) {
            throw new Error( err );
        }
        locked = false;
        if( pendingSave ) {
            write( target );
        }
    });
}



module.exports =function( location ) {
    loc = location;
    return new Proxy( { }, handler );
};

