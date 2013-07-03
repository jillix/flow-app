module.exports = new (require('pongo'))({
    host: M.config.mongoDB.host,
    port: M.config.mongoDB.port,
    server: {poolSize: 10},
    db: {w: 1}
});
