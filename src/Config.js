//The db config object
//it's a proxy, if a setting changes the json object is saved


let locked = false;
let pendingSave = false;

let handler = {
    set : function( target , key , value ) {
        if( target[ key ] !== value ) {
            target[ key ] = value;
            //save json file
            if( !locked ) {
                locked = true;
                pendingSave = false;

                //save and then when save is completed check pending save
            } else {
                pendingSave = true;
            }

        }

    }
};

module.exports = new Proxy( { }, handler );

