//chainable query api

//Basically we get all the query information by the chained API. We then run the queries on the indexes first before running the non indexed queries on the result set.
//Some queries can be streamed from disk, but things that require things like sorting (other than by PK descending) require the query to be loaded into memory

class Query {
    constructor( ) {
        this.table;
        this.indexes = [ ]; //destructure the query by index
    }

    table( tableName ) {
        this.table = tableName;
        return this;
    }

    get( index , value ) {
        return this;
    }

    between( index , lowerKey , upperKey ) {
        return this;
    }

    filter( fn ) {
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


    map( fn ) {
        return this;
    }

    reduce( fn ) {
        return this;
    }
    group( fn ) {
        return this;
    }
    fold( fn ) {
        return this;
    }

    sort( fn ) {
        return this;
    }

    reverse( ) {
        return this;
    }
    skip( num ) {
        return this;
    }

    limit( num ) {
        return this;
    }
    count() {
        return this;
    }
    all( cb ) {

    }
    forEach( cb ) {

    }
    toStream( cb ) {

    }
    toGenerator( cb ) {

    }
}