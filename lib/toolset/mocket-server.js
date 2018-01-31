'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');
var pinbug = require('debug')('zeroman:mocket-server');
var stupid = require('debug')('stupid:zeroman:mocket-server');
var util = require('util');
var MocketServer = require('mocket.io').Server;

var Constructor = function(kwargs) {
  kwargs = kwargs || {};

  var self = this;
  var _mocketServer;

  this.start = function(options) {
    _mocketServer = _mocketServer || new MocketServer({});
    return mocketServer;
  }
}

// -- default instance --

var _instance = new Constructor();

Object.defineProperty(_instance, 'new', {
  get: function() {
    return function(kwargs) {
      return new MocketServer(kwargs);
    }
  },
  set: function(val) {}
});

module.exports = _instance;
