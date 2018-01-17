'use strict';

var lodash = require('lodash');

var Constructor = function(kwargs) {

  var _store = {};

  this.setup = function(vars) {
    vars = vars || {};
    lodash.forEach(lodash.keys(vars), function(key) {
      if (_store[key] == undefined) {
        _store[key] = process.env[key];
      }
      process.env[key] = vars[key];
    });
    return this;
  }

  this.reset = function() {
    lodash.forEach(lodash.keys(_store), function(key) {
      process.env[key] = _store[key];
      delete _store[key];
    });
    return this;
  }

  return this.setup(kwargs);
}

var _instance = new Constructor();

Object.defineProperty(_instance, 'new', {
  get: function() {
    return function(kwargs) {
      return new Constructor(kwargs);
    }
  },
  set: function(val) {}
});

module.exports = _instance;
