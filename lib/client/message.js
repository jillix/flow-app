/**
 * Handle websocket messages.
 *
 * @public
 * @param {sring} The message data.
 * @param {object} The websocket.
 * @param {object} The session object.
 */
function messageHandler (message, websocket, session) {

    // parse message
    // protocoll: [type, instance, event, id, err, data]
    try {
        message = JSON.parse(message);
    } catch (error) {
        return;
    }
    
    // extract data from parsed message
    var type = message[0];
    var instance = message[1];
    var event = message[2];
    var id = message[3];
    var err = message[4];
    var data = message[5];
    
    if (engine.module.eventAccess) {

        // get module instance
        instance = engine.module.eventAccess(session[engine.session_role], instance ? instance : '@', event);

    } else {

        // get module instance
        instance = instance ? engine.instances[instance] : engine;
    }

    // return if instance doesn't exists
    if (!instance) {
        return;
    }

    // get the link object
    var link = instance._links[id];

    // create link and emit link event
    if (!link) {

        // create a new link with a custom id
        link = createLink.call(instance, event, null, id, websocket, session);

        // ensure socket on link
        link.socket = link.socket || websocket;

        // emit the new crated link
        if (instance.emit) {
            instance.emit(event, link);
        } else {
            instance.event(event).emit(link);
        }
    }

    // handle message types
    switch (type) {

        // END
        case 0:
            end(link, err, data);
            break;

        // DATA
        case 1:

            // call data handlers
            if (link._h.length) {
                for (var i = 0; i < link._h.length; ++i) {
                    link._h[i].call(link._, err, data);
                }
            }
    }
}
