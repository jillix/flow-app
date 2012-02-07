/**
 * handle forms
 */

/*TODO:
    - validator
    - multiple locales
    - grouping content ??
*/

this.init = function( config ) {
    
    var view = this,
        info = N.dom.findOne( "#noItemSelected", view.inst.dom ),
        image = null,
        hres = N.dom.findOne( "#hiddenResponse" ),
        currentData;
    
    hres.bind( "load", function(){
    	
    	//fire submit event
    	view.inst.preventPagingReset = 1;
        view.inst.obs.f( "formSubmit" );
    });
    
    //get image dom ref
    if( config.image ) image = N.dom.findOne( config.image.selector, view.form );
    
    //handle save button
    if( config.save ) {
        
        var button = N.dom.findOne( config.save.selector, view.inst.dom );
        
        if( button ) button.bind( config.save.event || "click", function() {
            
            view.form.action = "/content/save/?_s=" + window.name;
            view.form.submit();
        });
    }
    
    if( config.cancel ) {
        
        var button = N.dom.findOne( config.cancel.selector, view.inst.dom );
        
        if( button ) button.bind( config.cancel.event || "click", function() {
            
            image.src = "";
            view.form.style.display = "none";
            info.style.display = "block";
            view.inst.obs.f( "formReset" );
        });
    }
    
    view.inst.obs.l( this.query.source + "FindStart", function() {
    	
    	image.src = "";
    	view.form.style.display = "none";
        info.style.display = "block";
        view.inst.obs.f( "formReset" );
    });
    
    //form view API
    view.inst.obs.l( "formFillData", function( data ) {
        
        currentData = data;
        
        image.src = config.image.src + data[ config.image.name ] + "_big." + config.image.format;
        
        view.form.style.display = "block";
        info.style.display = "none";
    });
    
    if( config.localeChange ) view.inst.obs.l( "localeChange", function( locale ){
    	
        var query;
        
        if( currentData[ config.localeChange ] ) {
        	
        	query = { _l: locale };
        	query[ config.localeChange ] = currentData[ config.localeChange ];
        }
        
        if( query ) view.find( query );
    });
};