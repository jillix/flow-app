/**
 * Copyright 2010 Ajax.org B.V.
 *
 * This product includes software developed by
 * Ajax.org B.V. (http://www.ajax.org/).
 *
 * Author: Fabian Jaokbs <fabian@ajax.org>
 */

var util = require('util');
var AbstractApi = require("./abstract_api").AbstractApi;

/**
 * API wrapper for http://confluence.atlassian.com/display/BBDEV/Users
 */
var UsersApi = exports.UsersApi = function(api) {
    this.$api = api;
};

util.inherits(UsersApi, AbstractApi);

(function() {

    /**
     * Get user data including the repository list
     */
    this.getUsersData = function(username, callback) {
        this.$api.get("users/" + username, null, null, callback);
    };

}).call(UsersApi.prototype);
