'use strict';

var streamBuffers = require('stream-buffers');
var cardBalancer = require('./card-balancer');
var envCustomizer = require('./env-customizer');
var stdInterceptor = require('./std-interceptor');
var loggingTracer = require('./logging-tracer');
var mocketServer = require('./mocket-server');
var processRunner = require('./process-runner');

var Constructor = function(kwargs) {
  kwargs = kwargs || {};

  Object.defineProperties(this, {
    cardBalancer: {
      get: function() { return cardBalancer },
      set: function(val) {}
    },
    envCustomizer: {
      get: function() { return envCustomizer },
      set: function(val) {}
    },
    stdInterceptor: {
      get: function() { return stdInterceptor },
      set: function(val) {}
    },
    loggingTracer: {
      get: function() { return loggingTracer },
      set: function(val) {}
    },
    mocketServer: {
      get: function() { return mocketServer },
      set: function(val) {}
    },
    processRunner: {
      get: function() { return processRunner },
      set: function(val) {}
    },
    streamReader: {
      get: function() {
        return function() {
          return new streamBuffers.ReadableStreamBuffer();
        }
      },
      set: function(val) {}
    },
    streamWriter: {
      get: function() {
        return function() {
          return new streamBuffers.WritableStreamBuffer();
        }
      },
      set: function(val) {}
    }
  });
}

module.exports = Constructor;
