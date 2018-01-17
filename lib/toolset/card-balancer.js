'use strict';

var Loadsync = require('loadsync');

var cardBalancer = function(args) {
  return new Loadsync(args);
}

module.exports = cardBalancer;
