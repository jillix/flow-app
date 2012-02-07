this.init = function( config ) {
    
    var self = this;
        
    for( var field in config ) {
        
        //append default sort infos
        if( config[ field ].def ) {
        
            if( !this.query.defSort ) this.query.defSort = {};
            this.query.defSort[ field ] = config[ field ].def;
        }
        
        //append sort events
        var sortSelector = config[ field ].selector || config[ field ];
        if( typeof sortSelector == "string" ) {
            
            if( !this.sorting ) this.sorting = {};
            this.sorting[ field ] = N.dom.findOne( sortSelector, this.inst.dom );
            
            if( this.sorting[ field ] ) this.sorting[ field ].bind( "click", (function( field, sort_item ) {
            
                return function( ) {
                    
                    self.obs.f( "sortStart", sort_item );
                    
                    self.sort( field, function() {
                        
                        self.obs.f( "sortDone", sort_item );
                    });
                }
            
            })( field, this.sorting[ field ] ));
        }
    }
    
    //query function
    this.sort = function( field, value, callback ) {

        if( !this.query.sort ) this.query.sort = {};
        
        var order;
        
        if( typeof value == "function" || !value ) {
            
            order = this.query.sort[ field ] == 1 ? -1 : this.query.sort[ field ] == -1 ? 0 : 1;
            this.query.sort[ field ] = order;
        }
        else this.query.sort[ field ] = order = value;
        
        if( order > 0 ) this.obs.f( "sortAsc", this.sorting[ field ] );
        else if( order < 0 ) this.obs.f( "sortDesc", this.sorting[ field ] );
        else if( order == 0 ) this.obs.f( "noSort", this.sorting[ field ] );
        
        //reset paging
        //this.obs.f( "resetPaging" );
        
        this.find( callback || value );
    };
    
    //query handler
    this.query.handlers[ "sort" ] = function( request ) {
        
        if( self.query.sort ) {

            for( var field in self.query.sort ) {
                
                if( self.query.sort[ field ] ) {
                    
                    if( !request.options.sort ) request.options.sort = {};
                    request.options.sort[ field ] = self.query.sort[ field ];
                }
            }
            self.query.sorted = 1;
        }
        else if( self.query.defSort ) {
            
            request.options.sort = self.query.defSort;
            self.query.sorted = 1;
        }
        
        return request;
    };
};