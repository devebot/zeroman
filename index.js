'use strict';

var Constructor = require('./constructor');

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
