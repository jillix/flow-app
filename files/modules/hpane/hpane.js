this.init = function( config ) {
    
    var view = this;
    
    if( config.panes ) {
        
        //get dom panes
        var box         = N.dom.findOne( "div.hpane.box", view.inst.dom ),
            panes       = N.dom.find( "div.hpane.pane", view.inst.dom ),
            handlers    = N.dom.find( "div.hpane.handler", view.inst.dom ),
            handlerFn   = [],
            handler     = function( options, width ) {
                
                return function( event ) {
                    
                    event.stopPropagation();
                    
                    var al = parseInt( options.pa.style.left, 10 ) || 0,
                        br = parseInt( options.pb.style.right, 10 ) || 0;
                    
                    if( al + options.ma < event.clientX && event.clientX < ( width - br ) - options.mb ) {
                        
                        options.h.style.left = event.clientX + "px";
                        
                        options.pa.style.right = width - event.clientX + "px";
                        if( options.pb ) options.pb.style.left = event.clientX + 7 + "px";
                    }
                };
            };
        
        //check if panes corresponds with config and handlers, if not.. return
        if( panes.length != config.panes.length && panes.length != handlers.length - 1 ) return;
        
        //events
        window.bind( "mouseup", function( event ) {
            
            for( var i=0, l=handlerFn.length; i<l; ++i ) {
                
                window.unbind( "mousemove", handlerFn[ i ] );
            }
        });
        
        window.bind( "resize", function() {
            
            setup( parseInt( window.getComputedStyle( box ).getPropertyValue( "width" ), 10 ), true );
        });
        
        function setup( width, resize ) {
        
            //set css properties
            for( var i = 0, l = panes.length, left = 0, right = 0, width_pane; i < l; ++i ) {
                
                width_pane = config.panes[ i ].set > config.panes[ i ].min ? config.panes[ i ].set : config.panes[ i ].min;
                
                //set min-width value
                panes[ i ].style.minWidth = ( config.panes[ i ].min || 0 ) + "px";
                
                //set left offset
                if( i != 0 ) {
                
                    left = right + 7;
                    panes[ i ].style.left = left + "px";
                }
                
                //set right offset
                if( panes.length - 1 != i ) {
                    
                    right = left + width_pane;
                    panes[ i ].style.right = ( width - right ) + "px";
                }
                
                //position handlers
                if( handlers[ i ] ) {
                    
                    handlers[ i ].style.left = right + "px";
                    
                    handlerFn[ i ] = handler({
                            
                        h:  handlers[ i ],
                        pa: panes[ i ],
                        pb: panes[ i+1 ],
                        ma: config.panes[ i ].min || 0,
                        mb: config.panes[ i+1 ].min || 0
                    }, width );
                    
                    if( !resize ) {
                        
                        //bind event-handler to dom-handler
                        handlers[ i ].bind( "mousedown", (function( index ) {
                            
                            return function() {
                            
                                window.bind( "mousemove", handlerFn[ index ] );
                            }
                        
                        })( i ));
                    }
                }
            }
        }
        
        this.inst.obs.l( "load", function(){
        
        	setup( parseInt( window.getComputedStyle( box ).getPropertyValue( "width" ), 10 ) );
        	setup( parseInt( window.getComputedStyle( box ).getPropertyValue( "width" ), 10 ), true );
        });
    }
};