//chainable query api

//Basically we get all the query information by the chained API. We then run the queries on the indexes first before running the non indexed queries on the result set.
//Some queries can be streamed from disk, but things that require things like sorting (other than by PK descending) require the query to be loaded into memory

class Query {
    constructor( db ) {
        this._db = db;
        this._table;
        this._indexes = { }; //destructure the query by index
        this._filters = [ ];
    }

    table( tableName ) {
        this._table = tableName;
        return this;
    }

    get( index , value ) {
        if( !this._indexes.hasOwnProperty(index) ) {
            this._indexes[ index ] = [ ];
        }
        this._indexes[ index ].push( { type : "get" , index , value } );
        return this;
    }

    between( index , lowerKey , upperKey ) {
        if( !this._indexes.hasOwnProperty(index) ) {
            this._indexes[ index ] = [ ];
        }
        this._indexes[ index ].push( { type : "between" , index , lowerKey , upperKey } );
        return this;
    }

    filter( fn ) {
        this._filters.push( fn );
        return this;
    }

    filterIndex( index , fn ) {
        this._indexes[ index ].push( { type : "filter" , fn } );
        return this;
    }

    innerJoin( query ) {
        return this;
    }

    outerJoin( query ) {
        return this;
    }

    on( left , right ) {
        return this;
    }
    group( fn ) {
        return this;
    }

    reverse( ) {
        return this;
    }

    sort( fn ) {
        return this;
    }


    skip( num ) {
        return this;
    }

    limit( num ) {
        return this;
    }

    map( fn ) {

    }

    reduce( fn ) {

    }

    count( cb ) {
       //return a promise if no cb defined
    }
    all( cb ) {
        console.log(
        this._table,
        this._indexes , //destructure the query by index
        this._filters )
        //return a promise if no cb defined
    }
    forEach( cb ) {

    }
    toStream( ) {

    }
    toGenerator( ) {

    }
}

module.exports = Query;