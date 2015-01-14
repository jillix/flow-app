// engine websocket communication
(function (global, body, state) {

    var engine = global.E;

    // create the websocket
    var socket = engine.socket = new WebSocket('ws://' + state.host + '/');

    // parse websocket messages: [0|1,'instanceName:cbId','err','data']
    /**
        types:
        0: Call
        1: Event
        ---------------------------
        2: End
        3: Data
        4: Error

        protocoll:
        0, id, instance.method
        1, id, instance.event
        ---------------------------
        2, id, err, data
        3, id, data
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
                var instance = cache.I[data[0]];
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
        } else if (activeLinks[id]) {

            switch (type) {

                // END
                case 2:

                    // call the end handler
                    activeLinks[id].end(message[2], message[3]);
                    break;

                // DATA
                case 3:

                    // call data handlers
                    if (activeLinks[id]._h.length) {
                        for (var i = 0; i < activeLinks[id]._h.length; ++i) {
                            activeLinks[id]._h.call(activeLinks[id]._, data);
                        }
                    }
            }
        }
    };

    // link class
    var Link = {

        // send data
        send: function (data) {

            // create message
            var message = [

                //type
                3,

                // id
                this._id,

                // data
                data
            ];

            // encode message (string)
            try {
                message = JSON.stringify(message);

            // return error
            } catch (err) {
                return err;
            }

            // send message
            Z._ws.send(message);
        },

        // add data handler
        data: function (handler) {
            this._h.push(handler);
        },

        // end link
        end: function (err, data) {

            var message = [

                // type
                2,

                // id
                this._id,

                // error
                err,

                // data
                data
            ];

            // encode message (string)
            try {
                message = JSON.stringify(message);

            // return error
            } catch (err) {
                return err;
            }

            // destroy link
            delete activeLinks[id];

            // send message
            Z._ws.send(message);
        }
    };

    /**
     * Create a connected link.
     *
     * @public
     *
     * @param {?} ?
     */
    engine.link = function (instance, name, callOnEnd) {
        var self = this;

        // create link object
        var linkObject = self._clone(Link);

        // add instance to link
        linkObject._ = this;

        // data handlers
        linkObject._h = [],

        // creae a unique link id
        linkObject._id = this._uid(3);

        // attach end callback
        linkObject._end = callOnEnd;

        // save in link cache
        activeLinks[linkObject._id] = linkObject._id;

        var message = [

            // type !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            0,

            // id
            linkObject._id,

            // instance call/event
            instance + '.' + name
        ];

        // send message
        Z._ws.send(message);

        // return link object
        return linkObject;
    }

})(this, document, location);
