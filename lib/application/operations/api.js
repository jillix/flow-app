/*
TODO: API requests

1.  get role from api key
2.  create request
3.  stream response back to client
*/

// only for testing reasons
exports.login = function (link) {
    
    M.session.start(link, 1, 0, 'en-US', {data1: 'data1', data2: 'data2'}, function (err, session) {
        console.log(err || session);
        link.send(200);
    });
};
