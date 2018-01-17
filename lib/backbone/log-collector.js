'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');
var onDeath = require('death');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');

var DEFAULT_HOSTS = ['0.0.0.0', 'localhost'];
var DEFAULT_HOST = DEFAULT_HOSTS[0];
var DEFAULT_PORT = 17771;

var debugx = require('debug')('devebot-test:log-collector');
var debug0 = require('debug')('stupid:devebot-test:log-collector');

var Server = function Server(params) {
  debugx.enabled && debugx('constructor begin');

  var self = this;
  params = params || {};

  // -- Validate the Updater function --

  var updater = params.enqueue || params.update || params.parser;
  if (typeof(updater) !== 'function') {
    throw new Error('Updater should be a function (enqueue, update, parser)');
  }

  // -- HTTP Server --
  var serverName = params.serverName || 'logCollector';
  var appHost = params.host || DEFAULT_HOST;
  var appPort = params.port || DEFAULT_PORT;
  var appProto = 'http';
  var appPath = params.path || '*';
  appPath = (appPath instanceof Array) ? appPath : [appPath];

  var server = http.createServer();
  if (params.ssl && params.ssl.enabled !== false) {
    var keyText = params.ssl.key;
    var certText = params.ssl.cert;

    try {
      keyText = keyText || fs.readFileSync(params.ssl.keyFile);
      certText = certText || fs.readFileSync(params.ssl.certFile);
    } catch(error) {
      debugx.enabled && debugx('error on loading customized PEM files: %s', JSON.stringify(error));
    }

    if (!keyText && !certText && DEFAULT_HOSTS.indexOf(appHost)>=0) {
      keyText = fs.readFileSync(path.join(__dirname, '../ssl/' + DEFAULT_CERT + '.key.pem'));
      certText = fs.readFileSync(path.join(__dirname, '../ssl/' + DEFAULT_CERT + '.cert.pem'));
      debugx.enabled && debugx('Use default cert/key for HTTPS');
    }

    if (keyText && certText) {
      appProto = 'https';
      server = https.createServer({ key: keyText, cert: certText });
    }
  }

  self.start = function() {
    return new Promise(function(onResolved, onRejected) {
      var instance = server.listen(appPort, appHost, function () {
        var host = instance.address().address;
        var port = instance.address().port;
        params.verbose !== false &&
        console.log('%s is listening at %s://%s:%s', serverName, appProto, host, port);
        onResolved();
      });
    });
  }

  var appOnClosed;
  self.close = function() {
    debugx.enabled && debugx('%s - close() is invoked', serverName);
    return new Promise(function(onResolved, onRejected) {
      var timeoutHandler = setTimeout(function() {
        debugx.enabled && debugx('Timeout closing httpServer');
        onResolved();
      }, 30000);
      if (typeof(appOnClosed) === 'function') {
        server.removeListener("close", appOnClosed);
      }
      server.on("close", appOnClosed = function() {
        debugx.enabled && debugx('httpServer is closing ...');
      });
      server.close(function() {
        debugx.enabled && debugx('httpServer has been closed');
        clearTimeout(timeoutHandler);
        offDeath();
        onResolved();
      });
    }).then(function() {
      params.verbose !== false &&
      console.log('%s has been closed', serverName);
      return Promise.resolve();
    });
  }

  var offDeath = onDeath(function(signal, err) {
    self.close().finally(function() {
      debugx.enabled && debugx('mocket.io-server is terminated by signal: %s', signal);
    });
  });

  // -- RestAPI server --

  var restApp = express();

  restApp.use(bodyParser.json());
  restApp.use(bodyParser.urlencoded({extended: true}));

  restApp.all(appPath, cors(), function(req, res, next) {
    if (debug0.enabled) {
      process.nextTick(function() {
        debug0.enabled && debug0('=@ receives a new request:');
        debug0.enabled && debug0(' - Request URL: ' + req.url);
        debug0.enabled && debug0(' - Request method: ' + req.method);
        debug0.enabled && debug0(' - Request protocol: ' + req.protocol);
        debug0.enabled && debug0(' - Request host: ' + req.hostname);
        debug0.enabled && debug0(' - Request path: ' + req.path);
        debug0.enabled && debug0(' - Request originalUrl: ' + req.originalUrl);
        debug0.enabled && debug0(' - Request body: ' + JSON.stringify(req.body));
        debug0.enabled && debug0(' - User-agent: ' + req.headers['user-agent']);
      });
    }
    Promise.resolve()
      .then(function() {
        if (req.body) {
          return updater(req.body, lodash.pick(req, [
            'url', 'method', 'protocol', 'hostname', 'path', 'headers'
          ]));
        } else {
          return Promise.reject('invalid log message, body is empty');
        }
      })
      .then(function() {
        debugx.enabled && debugx(' - log message has been pushed successfully');
        res.status(200).send('Ok');
      })
      .catch(function(error) {
        res.status(404).send(error);
      })
      .finally(function() {
        debugx.enabled && debugx(' - log message pushing is done!');
      });
  });

  server.on('request', restApp);
}

module.exports = Server;

if (require.main === module) {
  var server = new Server({
    update: function(message, info) {
      debugx.enabled && debugx('Log message: %s', JSON.stringify(message, null, 2));
    }
  });
  server.start();
}
