this.init = function( config ) {
    
    var self = this,
        view = this;
    
    for( var name in config ) {
        
        if( config[ name ].query ) {
            
            if( !self.query.filter ) self.query.filter = {};
            
            self.query.filter[ name ] = {
                
                query: config[ name ].query
            };
            
            self.query.filter[ name ].type = config[ name ].type || null;
            
            //activate filter
            if( config[ name ].active ) self.query.filter[ name ].active = 1;
            
            //add filter events
            if( config[ name ].selector ) {
            
                if( !self.filtering ) self.filtering = {};
                self.filtering[ name ] = N.dom.findOne( config[ name ].selector, self.inst.dom );
            
                if( self.filtering[ name ] ) self.filtering[ name ].bind( config[ name ].event || "click", (function( filter_name, filter_item ) {
                
                    return function( event ) {
                        
                        self.obs.f( "filterStart", filter_item );
                        
                        self.filter( filter_name, filter_item.getAttribute( "name" ), filter_item.value, function(){
                            
                            self.obs.f( "filterDone", filter_item );
                        });
                    }
                    
                })( name, self.filtering[ name ] ));
            }
        }
    }
    
    this.filter = function( name, field, value, callback ) {
    
        if( this.query.filter && this.query.filter[ name ] ) {
            
            //set value
            if( field && value && value != "null" ) {
                
                if( this.query.filter[ name ].type == "int" ) value = parseInt( value, 10 );
                if( this.query.filter[ name ].type == "float" ) value = parseFloat( value, 10 );
                
                this.query.filter[ name ].query[ field ] = value;
                this.query.filter[ name ].active = 1;
                
                this.obs.f( "filterActive", this.filtering[ name ] );
            }
            //activate/deactivate filter
            else {
                
                var active = this.query.filter[ name ].active ? 0 : 1;
                this.query.filter[ name ].active = active;
                
                if( active ) this.obs.f( "filterActive", this.filtering[ name ] );
                else this.obs.f( "filterInactive", this.filtering[ name ] );
            }
            
            //reset paging
            //this.obs.f( "resetPaging" );
            
            this.find( callback );
        }
    };
    
    //add query handler
    this.query.handlers[ "filter" ] = function( request ){
        
        //filter
        if( view.query.filter ) {
        
            for( var name in view.query.filter ) {
                
                if( view.query.filter[ name ].active ) {
                    
                    for( var key in view.query.filter[ name ].query ) {
                        
                        request.query[ key ] = view.query.filter[ name ].query[ key ];
                    }
                }
            }
            view.query.sorted = 1;
        }
        
        return request;
    };
};