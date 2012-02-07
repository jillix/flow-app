this.init = function( config ) {
    
    var self = this;
    
    //append search fields to query
    if( config.fields ) {
    
        this.query.search = { fields: config.fields };
    }
    
    //search function
    this.search = function( value, callback ) {
    
        if( typeof value == "string" ) {
            
            var tmp = value.toLowerCase().replace( /[^a-z0-9äöüàáèéìíòóùú]/g, " " ).split( " " );
            
            self.query.search.term = [];
            
            for( var i=0,l=tmp.length; i<l; ++i ) {
                
                if( tmp[ i ] ) self.query.search.term.push( tmp[ i ] );
            }
        }
        else self.query.search.term = value;
        
        self.find( callback );
    };
    
    //dom event
    if( config.selector ) {
        
        var search_item = N.dom.findOne( config.selector, this.inst.dom );
        
        if( search_item ) search_item.bind( "keyup", function(){
            
            self.obs.f( "searchStart", search_item );
            
            self.search( search_item.value, function(){
                
                self.obs.f( "searchDone", search_item );
            });
        });
    }
    
    //query handler
    this.query.handlers[ "search" ] = function( request ) {
        
        if( self.query.search && self.query.search.term && self.query.search.term.length ) {
        
            request.search = [ self.query.search.fields, self.query.search.term ];
            self.query.sorted = 1;
        }
        
        return request;
    }
};