var Cache = {
    get: function (id) {
        return this.cache[id];
    },
    save: function (id, data) {
        this.cache[id] = data;
    },
    rm: function (id) {
        if (typeof this.cache[id] !== 'undefined') {
            delete this.cache[id];
        }
    }
};

function Constructor () {
    var cache = Cache.clone();
    cache.cache = {};
    return cache;
}

module.exports = Constructor;

