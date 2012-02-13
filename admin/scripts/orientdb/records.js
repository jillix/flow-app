var q = require( process.env.ROOT + "/db/queries" );

q.insertUser({ name: "Guido Fawkes" }, function( err, res ){
	
	console.log( err );
	var publicUser = res.substr( 2 );
	q.insertUser({ name: "Adrian Ottiker" }, function( err, res ){
		
		console.log( err );
		var adminUser = res.substr( 2 );
		q.insertRole( "public", "Mono System Public Role", function( err, res ){
			
			console.log( err );
			var publicRole = res.substr( 2 );
			q.insertRole( "admin", "Mono System Administrator", function( err, res ){
			
				console.log( err );
				var adminRole = res.substr( 2 );
				q.insertOperation( "/core/files", "index", function( err, res ){
					
					console.log( err );
					var opClient = res.substr( 2 );
					q.insertOperation( "/core/files", "modules", function( err, res ){
					
						console.log( err );
						var opModules = res.substr( 2 );
						q.insertOperation( "/core/comp", "comp", function( err, res ){
						
							console.log( err );
							var opComp = res.substr( 2 );
							q.insertUIElement({ name: "adminMain" }, function( err, res ){
								
								console.log( err );
								var uie1 = res.substr( 2 );
								q.insertUIElement({ name: "ace" }, function( err, res ){
									
									console.log( err );
									var uie2 = res.substr( 2 );
									q.insertUIElement({ name: "list" }, function( err, res ){
									
										console.log( err );
										var uie3 = res.substr( 2 );
										q.assignUserToRole( publicUser, publicRole, function( err, res ){
											
											console.log( err );
											q.assignUserToRole( adminUser, adminRole, function( err, res ){
												
												console.log( err );
												q.assignRoleToOperation( publicRole, opClient, function( err, res ){
													
													console.log( err );
													q.assignRoleToOperation( publicRole, opModules, function( err, res ){
												
														console.log( err );
														q.assignRoleToOperation( publicRole, opComp, function( err, res ){
															
															console.log( err );
															q.assignRoleToOperation( adminRole, opClient, function( err, res ){
														
																console.log( err );
																q.assignRoleToOperation( adminRole, opComp, function( err, res ){
																
																	console.log( err );
																	q.assignRoleToUIElement( "mono.ch", "view1", publicRole, uie2, { config: "UIElement 1" }, function( err, res ){
																		
																		console.log( err );
																		q.assignRoleToUIElement( "mono.ch", "view1", adminRole, uie2, { config: "UIElement 1" }, function( err, res ){
																			
																			console.log( err );
																			q.assignRoleToUIElement( "adminMain", "view2", adminRole, uie1, { config: "UIElement 2" }, function( err, res ){
																			
																				console.log( err );
																				q.assignRoleToUIElement( "compXY", "view3", adminRole, uie3, { config: "UIElement 3" }, function( err, res ){
																			
																					console.log( err );
																					console.log( "Public User: " + publicUser );
																					console.log( "Admin User: " + adminUser );
																				});
																			});
																		});
																	});
																});
															});
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});
});
