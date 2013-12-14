var dataKey = '_data';
var Cache = {
    get: function (id) {
        return this[dataKey][id];
    },
    save: function (id, data) {
        this[dataKey][id] = data;
    },
    rm: function (id) {
        if (typeof this[dataKey][id] !== 'undefined') {
            delete this[dataKey][id];
        }
    },
    empty: function () {
        this[dataKey] = {};
    },
    getAll: function () {
        return this[dataKey];
    }
};

function Constructor () {
    var cache = Cache.clone();
    cache[dataKey] = {};
    return cache;
}

module.exports = Constructor;
