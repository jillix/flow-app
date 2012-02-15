this.port = 80;

this.dev = true;

this.devPort = 8000;

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

this.operationKey = "@";

this.forever = {
    
    maxAttempts:   23,
    minUptime:     2000,
    spinSleepTime: 1000,
    mail:          "adrian@ottiker.com"
};