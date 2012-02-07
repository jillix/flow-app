this.dev = true;

this.devPort = 8008;

this.root = __dirname;

this.orientDB = {
    
    //create: true,
    host:     "localhost",
    port:     2480,
    name:     "mono",
    username: "admin",
    password: "admin"
};

this.mongoDB = {
    
    name: "mono",
    host: "localhost",
    port: 27017
};

this.public_user = "1";

this.default_operation = "4";

this.forever = {
    
    maxAttempts:   23,
    minUptime:     2000,
    spinSleepTime: 1000,
    mail:          "adrian@ottiker.com"
};