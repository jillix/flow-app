// engine websocket communication
(function (global, body, state) {

    var engine = global.E;

    // connected links cache
    engine.links = {};

    // create the websocket
    var socket = engine.socket = new WebSocket('ws://' + state.host + '/');

    socket.onopen = function () {

        // configure module load link
        /*engine.on('M>', engine.link({
            to: '_',
            call: 'load'
        }));*/
    };

    /**
        types:
        0: End
        1: Data

        protocoll:
        type, instance, event, id, err data
    */
    socket.onmessage = function (message) {

        // parse message
        try {
            message = JSON.parse(message.data);
        } catch (error) {
            return;
        }

        // get values
        var type = message[0];
        var id = message[1];
        var data = message[2];

        // handle push
        if (type < 2) {
            data = data.split('.');

            // get instance
            if (cache.I[data[0]]) {
                var instance = engine.modules[data[0]];
                var link = instance._clone(Link);

                // add instance to link
                link._ = instance;

                // data handlers
                link._h = [],

                // creae a unique link id
                link._id = id;

                // call instance method
                if (type === 0 && typeof instance[data[1]] === fn) {
                    instance[data[1]].call(instance, {link: link});
                }

                // emit an event on the instance
                if (type === 1) {
                    instance.emit({link: link});
                }
            }

        // handle data
        } else if (engine.links[id]) {

            switch (type) {

                // OPEN
                case 2:

                    // call the open handler
                    engine.links[id]._open(message[2], message[3]);

                    break;

                // DATA
                case 3:

                    // call data handlers
                    if (engine.links[id]._h.length) {
                        for (var i = 0; i < engine.links[id]._h.length; ++i) {
                            engine.links[id]._h.call(engine.links[id]._, data);
                        }
                    }

                    break;

                // END
                case 4:

                    // call the end handler
                    engine.links[id]._end(message[2], message[3]);

                    // destroy link
                    delete engine.links[id];

                    break;
            }
        }
    };

    // link class
    var Link = {

        // send data
        send: function (err, data) {

            // send message
            send.call(this, 1, err, data);
        },

        // add data handler
        data: function (handler) {
            this._h.push(handler);
        },

        // end link
        end: function (err, data) {

            // send message
            send.call(this, 0, err, data);

            // destroy link
            delete engine.links[id];
        }
    };

    /**/
    function send (type, err, data) {

        // create message
        var message = [type, this._._name, this.event, this.id, err, data];

        // encode message (string)
        try {
            message = JSON.stringify(message);

        // return error
        } catch (err) {
            return err;
        }

        // send message
        engine.socket.send(message);
    }

    /**
     * Create a connected link.
     *
     * @public
     * @param {object} The link configuration.
     * @param {function} The connection end handler.
     */
    engine.link = function (event, callOnEnd) {

        // create link object
        var link = engine.clone(Link);

        // add instance to link
        link._ = this;

        // data handlers
        link._h = [],

        // creae a unique link id
        link.id = engine.uid(3);

        // attach end callback
        link._end = callOnEnd || function () {};

        // save link event
        link.event = event;

        // save in link cache
        engine.links[link.id] = link;

        // return link object
        return link;
    };

})(this, document, location);
