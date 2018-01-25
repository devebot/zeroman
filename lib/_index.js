'use strict';

var appRootPath = require('app-root-path');
var path = require('path');
var pathExists = require('path-exists');
var lodash = require('lodash');
var DevebotApi = require('devebot-api');
var pinbug = require('debug')('devebot-test:utilities');
var Toolset = require('./toolset/_index');
var http = require('http');
var https = require('https');
var util = require('util');

var Constructor = function(kwargs) {

  this.isServiceReady = function(opts) {
    return new Promise(function(onResolved, onRejected) {
      var reqParams = lodash.pick(opts, ['url', 'statusCode']);
      var count = 0, state = null;
      var handler1, handler2;
      var stopRetrying = function(info) {
        handler1 && clearInterval(handler1);
        handler1 = null;
        handler2 && clearTimeout(handler2);
        handler2 = null;
        if (info && info.ok === true) {
          onResolved(info);
        } else {
          onRejected(info);
        }
      }
      handler1 = setInterval(function() {
        count += 1;
        if (count > opts.retryMax) stopRetrying({
          ok: false,
          reason: 'exceeding retryMax'
        });
        checkHttpAvailable(reqParams).then(function(result) {
          if (result.ok) stopRetrying(result);
        });
      }, 500);
      handler2 = setTimeout(stopRetrying.bind(null, {
        ok: false,
        reason: 'request is timeout'
      }), opts.timeout || 30000);
    });
  }

  this.connectService = function(options) {
    options = options || {};
    var cfg = lodash.merge({
      host: '127.0.0.1',
      port: 17779,
      path: '/demo-app',
      authen: {
        token_key: 'devebot',
        token_secret: 's3cr3tpa$$w0rd'
      },
      stateMap: {
        "definition": "definition",
        "started": "started",
        "progress": "progress",
        "timeout": "timeout",
        "failed": "failed",
        "cancelled": "cancelled",
        "completed": "completed",
        "done": "done",
        "noop": "noop"
      }
    }, options);
    pinbug.enabled && pinbug(' - API connection: %s', JSON.stringify(cfg, null, 2));
    return new DevebotApi(cfg);
  }

  this.getTestHomeDir = function() {
    return appRootPath.resolve('./test');
  }

  this.getTestPath = function() {
    var dirpath = buildTestPath.apply(this, arguments);
    if (!pathExists.sync(dirpath)) {
      throw new Error(util.format('Path: %s is not found', dirpath));
    }
    return dirpath;
  }

  this.loadTestModule = function() {
    return require(buildTestPath.apply(this, arguments));
  }

  var buildTestPath = function() {
    var pathArray = Array.prototype.slice.call(arguments);
    pathArray.unshift(this.getTestHomeDir());
    var dirpath = path.join.apply(path, pathArray);
    pinbug.enabled && pinbug('buildTestPath: %s', dirpath);
    return dirpath;
  }

  var checkHttpAvailable = function(opts) {
    opts = opts || {};
    var handler = opts.protocol === 'https' ? https : http;
    return new Promise(function(onResolved, onRejected) {
      handler.get(opts.url, function(resp) {
        var data = '';

        resp.on('data', function(chunk) {
          pinbug.enabled && pinbug('A chunk of data has been recieved: %s', chunk);
          data += chunk;
        });

        resp.on('end', function() {
          pinbug.enabled && pinbug('checkHttpAvailable() - response is end: %s', data);
        });

        if (resp.statusCode === (opts.statusCode || 200)) {
          onResolved({
            ok: true
          });
        } else {
          onResolved({
            ok: false
          });
        }
      }).on("error", function(err) {
        onResolved({
          ok: false,
          message: err.message,
          error: err
        });
      });
    });
  }

  // -- toolset definition --

  var _toolset;

  Object.defineProperty(this, 'toolset', {
    get: function() {
      return (_toolset = _toolset || new Toolset(kwargs));
    },
    set: function(val) {}
  });

  // -- Default settings --

  Object.defineProperties(this, {
    DEFAULT_TIMEOUT: {
      get: function() { return 600000 },
      set: function(val) {}
    }
  });
};

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
