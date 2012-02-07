this.init = function( config ) {
    
    var view = this,
        self = this,
        handler = function(){ self.page( 0 ); };
    
    this.query.page = {
        
        max:    2,
        page:   0,
        skip:   parseInt( config.page, 10 ) || 0,
        limit:  parseInt( config.limit, 10 ) || 8
    };
    
    this.paging = {
        
        page:   N.dom.find( config.page, this.inst.dom ),
        of:     N.dom.find( config.of, this.inst.dom ),
        forw:	N.dom.find( config.forw, this.inst.dom ),
        back: 	N.dom.find( config.back, this.inst.dom ),
        cont:	N.dom.find( config.container, this.inst.dom )
    };
    
    //set of nummber
    var bindPaging = function( view, item, direction ) {
        
            if( item ) for( var i=0, l=item.length; i<l; ++i ) {
            	
            	item[ i ].bind( "click", (function( _item ){
                	
                	return function(){
                	
            	    	view.page( direction, function() {
            	    	    
            	    	    view.obs.f( "pagingDone", _item );
            	    	});
            	    }
            	    
            	})( item[ i ] ));
            }
        };
    
    if( config.forw ) {
        
        bindPaging( self, this.paging.forw, 1 );
    }
    
    if( config.back ) {
        
        bindPaging( self, this.paging.back, -1 );
    }
    
    //set max pages
    if( self.of ) self.count(function( err, count ) {
        
        if( !err ) {
            
            //set max pages
            var maxPages = self.query.page.max = Math.ceil( count / self.query.page.limit );
            
            if( maxPages > 1 ) {
                    	
            	//show paging buttons
            	for( var i=0, l=view.paging.forw.length; i<l; ++i ) { self.paging.forw[ i ].style.display = "block"; }
            	for( var i=0, l=view.paging.back.length; i<l; ++i ) { self.paging.back[ i ].style.display = "block"; }
            }
            else {
            	
            	//hide paging buttons
            	for( var i=0, l=view.paging.forw.length; i<l; ++i ) { self.paging.forw[ i ].style.display = "none"; }
            	for( var i=0, l=view.paging.back.length; i<l; ++i ) { self.paging.back[ i ].style.display = "none"; }
            }
            
            for( var i=0, l=self.paging.of.length; i<l; ++i ) {
            	
            	self.paging.of[ i ].innerHTML = maxPages || 1;
            }
        }
    });
    
    //reset paging
    view.obs.l( "findStart", handler );
    
    //hide paging
    view.obs.l( "findEmpty", function(){
    	
    	for( var i=0, l=view.paging.cont.length; i<l; ++i ) { self.paging.cont[ i ].style.display = "none"; }
    });
    
    //show paging
    view.obs.l( "findData", function(){
    	
    	for( var i=0, l=view.paging.cont.length; i<l; ++i ) { self.paging.cont[ i ].style.display = "block"; }
    });
    
    this.page = function( value, callback ) {
    
        var self = this;
        
        if( self.query.page ) {
            
            if( value == 0 ) {
                
                self.query.page.skip = 0;
                self.query.page.page = 0;
                
                for( var i=0, l=self.paging.page.length; i<l; ++i ) {
                	
                	self.paging.page[ i ].innerHTML = 1;
                }
                
                view.count(function( err, count ) {
    				
    				var maxPages = view.query.page.max = Math.ceil( count / view.query.page.limit );
    				
    				if( maxPages > 1 ) {
                    	
                        //show paging buttons
                        for( var i=0, l=view.paging.forw.length; i<l; ++i ) { self.paging.forw[ i ].style.display = "block"; }
                        for( var i=0, l=view.paging.back.length; i<l; ++i ) { self.paging.back[ i ].style.display = "block"; }
                    }
                    else {
                        
                        //hide paging buttons
                        for( var i=0, l=view.paging.forw.length; i<l; ++i ) { self.paging.forw[ i ].style.display = "none"; }
                        for( var i=0, l=view.paging.back.length; i<l; ++i ) { self.paging.back[ i ].style.display = "none"; }
                    }
    				
                    if( !err ) for( var i=0, l=view.paging.of.length; i<l; ++i ) {
                    	
                    	view.paging.of[ i ].innerHTML = maxPages || 1;
                    }
                });
                
                if( callback ) callback();
            }
            else if( self.query.page.page + value > -1 && self.query.page.page + value < self.query.page.max ) {
                
                self.count(function( err, count ) {
                    
                    //save max pages
                    var maxPages = self.query.page.max = Math.ceil( count / self.query.page.limit );
                    
                    if( maxPages > 1 ) {
                    	
                    	//show paging buttons
                    	for( var i=0, l=view.paging.forw.length; i<l; ++i ) { self.paging.forw[ i ].style.display = "block"; }
                    	for( var i=0, l=view.paging.back.length; i<l; ++i ) { self.paging.back[ i ].style.display = "block"; }
                    }
                    else {
                    	
                    	//hide paging buttons
                    	for( var i=0, l=view.paging.forw.length; i<l; ++i ) { self.paging.forw[ i ].style.display = "none"; }
                    	for( var i=0, l=view.paging.back.length; i<l; ++i ) { self.paging.back[ i ].style.display = "none"; }
                    }
                    
                    for( var i=0, l=self.paging.of.length; i<l; ++i ) {
                    	
                    	self.paging.of[ i ].innerHTML = maxPages || 1;
                    }
                    
                    if( self.query.page.page + value < self.query.page.max ) {
                        
                        //save current page position
                        var curPos = ( self.query.page.page += value ) + 1;
                        for( var i=0, l=self.paging.page.length; i<l; ++i ) {
                        	
                        	self.paging.page[ i ].innerHTML = curPos;
                        }
                        
                        //fire paging event with paging infos
                        self.obs.f( "pagingStart", self.query.page );
                    
                        //update paging infos
                        self.query.page.skip = value ? self.query.page.limit * self.query.page.page : value;
                        
                        view.obs.r( "findStart", handler );
                        
                        view.find(function() {
                            
                            view.obs.l( "findStart", handler );
                        });
                    }
                });
            }
        }
    };
    
    //add query handler
    this.query.handlers[ "page" ] = function( request ) {
    
        //pagin
        if( view.query.page ) {
            
            if( view.query.page.skip ) request.options.skip = view.query.page.skip;
            if( view.query.page.limit ) request.options.limit = view.query.page.limit;
            
            view.query.sorted = 1;
        }
        
        return request;
    };
};