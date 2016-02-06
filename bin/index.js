var Flow = require('flow');
var config = require('./config.js');

Flow(config, {

    mod: function loadModule (name, callback) {

        try {
            var module = require(name[0] === '/' ? this.config.paths.custom + name : name);
        } catch (err) {
            return callback(err);
        }

        callback(null, module);
    },

    mic: function (name, callback) {

        try {
            var composition = require(this.config.paths.composition + '/' + name + '.json');
        } catch (err) {
            return callback(err);
        }

        callback(null, composition);
    }

}).load();
