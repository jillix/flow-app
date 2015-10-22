'use strict';

var Flow = require('../flow/flow');

/**
 * Handle http requests.
 *
 * @public
 * @param {object} The session object.
 * @param {object} The http request object.
 * @param {object} The http response object.
 */
module.exports = function (req, res, next) {

    var stream = Flow.emit(req.params.instance + '/' + req.params.event, {req: req, res: res});

    // setup stream
    //stream.end = res.end;
    //stream.data(res.send);
    //stream.error(function (err, status) {res.status(status); res.send(err)});

    req.on('data', function (chunk) {
        stream.write(null, chunk);
    });
    req.on('error', function (chunk) {
        stream.write(chunk);
    });

    res.end('Flow emit: ' + req.params.instance + '/' + req.params.event)

    //setupStream(instanceName, eventName, req, res, path, url);
};

function setupStream (instanceName, eventName, req, res, path, url) {

    // create an event stream
    var stream = engine.flow([['flow', {'emit': instanceName + '/' + eventName}]]);
    stream.context = {
        req: req,
        res: res,
        headers: {'content-type': 'text/plain'},
        session: req.session,
        path: path,
        pathname: url.pathname,
        query: url.query
    };
    stream._end = end;
    stream.data(send);

    // TODO improve HTTP error options
    stream.error(send);

    // send request data to event stream
    req.on('data', function (chunk) {
        stream.write(null, chunk);
    });

    // write error to event streams
    req.on('error', function (error) {
        engine.log('E', error);
        stream.write(error);
    });

    // resume request (emit data events)
    req.resume();
}
