(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//var flow = require('./flow');

// init flow with core module
//flow(this.exports);

exports.composition = '@C';
exports.markup = '@M';

exports.log = function (err) {return err}; //require('./logs') ||

exports.cache = function () {

};

exports.client = function () {

};

exports.module = bundle;
window.loadModule = bundle;

function bundle (name, callback) {

    // TODO how to get main module.exports of the loaded bundle?

    // crate script dom elemeent
    var node = document.createElement('script');

    node.onload = function () {
        callback(null, require(name));
    };

    // set url and append dom script elm to the document head
    node.src = '/' + name + '/client.js';
    document.head.appendChild(node);
    node.remove();
}

},{}]},{},[1]);
