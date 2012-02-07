this.init = function( config ) {
	
	var pub = N.dom.findOne( config.pub, this.inst.dom ),
		pwd = N.dom.findOne( config.pwd, this.inst.dom ),
		btn = N.dom.findOne( config.btn, this.inst.dom ),
		login = function( ) {
        	
		    N.mod( "l" ).load( "/crypto", function( ){
		        
		        if( pub.value && pwd.value ) N.link( "/nonce", function( err, response, xhr ){
		        	
		            if( !err && response ) N.link( "/login", { data: [ pub.value, Crypto.SHA1( response + pwd.value ), response ] }, function( err ) {
		            	
		            	if( err ) callback( err );
		            	else window.location.reload();
		            });
		            else pwd.value = "";
		        });
		        else pwd.value = "";
		    });
		};
	
	if( pub && pwd ) {
		
		if( btn ) btn.bind( "click", function() {
			
			login();
		});
		
		pub.bind( "keyup", function( event ) {
				
		    if( event.keyCode == 13 ) login();
		});
		
		pwd.bind( "keyup", function( event ) {
				
		    if( event.keyCode == 13 ) login();
		});
	}
};