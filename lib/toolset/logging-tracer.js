'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');
var loglyzer = require('loglyzer');
var LogCollector = require('./log-collector');
var dbx = require('debug')('zeroman:process-runner');

var Constructor = function(kwargs) {
  kwargs = kwargs || {};
  var _accumulator = {};
  var _processor;
  var _processing = false;
  var _running = false;

  var _collector = new LogCollector({
    update: function(chunk) {
      dbx.enabled && dbx(' - push message <%s> into loglyzer',
        lodash.isString(chunk) ? chunk : JSON.stringify(chunk));
      _processor.collect(chunk);
    }
  });

  var _init = function(_filters, _interceptors) {
    _clear(_accumulator);
    if (_filters && !(_filters instanceof Array)) {
      throw new Error('filter mappings is not an array');
    }
    var _interceptors = _interceptors || [];
    if (_filters) {
      _interceptors.push(loglyzer.accumulationAppender.bind(null, _filters, _accumulator));
    }
    return _interceptors;
  }

  var _clear = function(map) {
    Object.keys(map).forEach(function(key) {
      delete map[key];
    });
    return map;
  }

  this.start = function(options, callback) {
    if (_running) return Promise.resolve();
    options = options || {};
    var _stopWhen = null;
    if (options.stopWhen) {
      _stopWhen = function(packet) {
        return !(options.stopWhen(packet, _accumulator));
      }
    }
    _processor = loglyzer.getProcessor({
      retryDelay: options.retryDelay || 500,
      retryTotal: options.retryTotal || 20,
      forceParsingFields: ['message', 'params.message'],
      projector: function(data) {
        if (data && typeof(data) === 'object') {
          return data.message || data.params.message;
        }
        return {};
      },
      posterior: _stopWhen,
      interceptors: _init(options.filters || options.descriptors, options.interceptors)
    });
    return _collector.start().then(function(info) {
      _running = true;
      return info;
    });
  }

  this.process = function() {
    if (_processing) return Promise.reject({
      message: 'Aggregator is processing'
    });
    _processing = true;
    return _processor.process().then(function(stats) {
      _processing = false;
      return _accumulator;
    });
  }

  this.close = function() {
    if (_running) {
      return _collector.close().then(function(info) {
        _running = false;
        return info;
      });
    }
    return Promise.resolve();
  }

  this.stop = this.close;

  this.status = function() {
    return {
      running: _running,
      processing: _processing
    }
  }
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
