'use strict';

var Constructor = function(kwargs) {

  var _store = {};

  this.setup = function(vars) {
    vars = vars || {};
    Object.keys(vars).forEach(function(key) {
      _store[key] = process.env[key];
      if (vars[key] == null) {
        delete process.env[key];
      } else {
        process.env[key] = vars[key];
      }
    });
    return this;
  }

  this.reset = function() {
    Object.keys(_store).forEach(function(key) {
      delete process.env[key];
      if (typeof(_store[key]) === 'string') {
        process.env[key] = _store[key];
      }
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
