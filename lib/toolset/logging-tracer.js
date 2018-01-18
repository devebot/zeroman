'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');
var loglyzer = require('loglyzer');
var LogCollector = require('../backbone/log-collector');
var dbx = require('debug')('devebot-test:process-runner');

var Constructor = function(kwargs) {
  kwargs = kwargs || {};
  var _accumulator = {}, _aggregator;
  var _running = false;
  var _processing = false;

  var _collector = new LogCollector({
    update: function(chunk) {
      dbx.enabled && dbx(' - update(): %s', 
          lodash.isString(chunk) ? chunk : JSON.stringify(chunk));
      if (typeof chunk === 'string') {
        try {
          chunk = JSON.parse(chunk);
        } catch (err) {}
      }
      var packet = chunk.message || chunk.params.message;
      if (typeof packet === 'string') {
        try {
          packet = JSON.parse(packet);
        } catch (err) {}
      }
      dbx.enabled && dbx(' - collect(): %s', 
          lodash.isString(packet) ? packet : JSON.stringify(packet));
      _aggregator.collect(packet);
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
    _aggregator = loglyzer.getAggregator({
      failAfter: options.failAfter || 10,
      waitingFor: options.waitingFor || 500,
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
    return _aggregator.process().then(function(stats) {
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
