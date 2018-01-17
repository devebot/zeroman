'use strict';

var Promise = require('bluebird');
var lodash = require('lodash');
var pm2 = require('pm2');
var pinbug = require('debug')('devebot-test:process-runner');
var stupid = require('debug')('stupid:devebot-test:process-runner');
var util = require('util');

var Constructor = function(kwargs) {
  kwargs = kwargs || {};

  var self = this;
  var noDaemonMode = (kwargs.noDaemonMode !== false);

  this.start = function(pm2opts) {
    return new Promise(function(onResolved, onRejected) {
      pm2.connect(noDaemonMode, function(err) {
        if (err) return onRejected({
          reason: 'connect-failed',
          error: err
        });
        pm2.start(pm2opts, function(err, procs) {
          pm2.disconnect();
          if (err) {
            onRejected({
              reason: 'start-failed',
              error: err
            });
          } else {
            if (procs instanceof Array) {
              procs = lodash.map(procs, function(proc) {
                return lodash.pick(proc, [
                  'pid',
                  'pm2_env.HOME',
                  'pm2_env.PWD',
                  'pm2_env.name',
                  'pm2_env.exec_mode',
                  'pm2_env.pm_id',
                  'pm2_env.pm_exec_path',
                  'pm2_env.pm_pid_path',
                  'pm2_env.pm_err_log_path',
                  'pm2_env.pm_out_log_path',
                  'pm2_env.exec_interpreter',
                  'pm2_env.node_args',
                  'pm2_env.instances',
                  'pm2_env.instance_var',
                  'pm2_env.NODE_APP_INSTANCE',
                  'spawnfile',
                  'exitCode',
                  'signalCode',
                  'killed',
                  'connected'
                ]);
              });
            }
            onResolved(procs);
            stupid.enabled && stupid('Application has been started: %s',
                JSON.stringify(procs, null, 2));
          }
        });
      });
    });
  }

  var actionDef = function(action, pm2opts) {
    var _actionFunc = function(processName) {
      return new Promise(function(onResolved, onRejected) {
        pm2.connect(noDaemonMode, function(err) {
          if (err) return onRejected({
            name: processName,
            action: action,
            reason: 'connect-failed',
            error: err
          });
          pm2[action](processName, function(err) {
            pm2.disconnect();
            if (err) {
              onRejected({
                name: processName,
                action: action,
                reason: 'execute-failed',
                error: err
              });
            } else {
              onResolved({
                name: processName,
                action: action,
                status: 'completed'
              });
            }
          });
        });
      });
    }
    return getProcessName(pm2opts).then(applyAction.bind(null, _actionFunc));
  }

  lodash.forEach(['stop', 'restart', 'delete'], function(action) {
    self[action] = actionDef.bind(null, action);
  });

  this.status = function(pm2opts) {
    var _status = function(processName) {
      return new Promise(function(onResolved, onRejected) {
        pm2.connect(noDaemonMode, function(err) {
          if (err) return onRejected({
            reason: 'connect-failed',
            error: err
          });
          pm2.describe(processName, function(err, procs) {
            pm2.disconnect();
            if (err) {
              onRejected({
                reason: 'status-failed',
                error: err
              });
            } else {
              stupid.enabled && stupid('Procs: %s', JSON.stringify(procs, null, 2));
              onResolved(lodash.map(procs, extractProcessInfo));
            }
          });
        });
      });
    }
    return getProcessName(pm2opts).then(applyAction.bind(null, _status));
  }

  this.list = function() {
    var _list = function() {
      return new Promise(function(onResolved, onRejected) {
        pm2.connect(noDaemonMode, function(err) {
          if (err) return onRejected({
            reason: 'connect-failed',
            error: err
          });
          pm2.list(function(err, procs) {
            pm2.disconnect();
            if (err) {
              onRejected({
                reason: 'list-failed',
                error: err
              });
            } else {
              stupid.enabled && stupid('Procs: %s', JSON.stringify(procs, null, 2));
              onResolved(lodash.map(procs, extractProcessInfo));
            }
          });
        });
      });
    }
    return _list();
  }

  this.deleteAll = function() {
    var self = this;
    return self.list()
      .then(function(procs) {
        return lodash.map(procs, lodash.partial(lodash.get, lodash, 'name'))
      })
      .then(function(names) {
        if (lodash.isEmpty(names)) return [];
        return self.delete(names);
      })
  }

  var getProcessName = function(pm2opts) {
    if (lodash.isString(pm2opts)) return Promise.resolve(pm2opts);
    if (lodash.isObject(pm2opts) && lodash.isString(pm2opts.name)) return Promise.resolve(pm2opts.name);
    if (lodash.isArray(pm2opts)) {
      var procNames = [];
      lodash.forEach(pm2opts, function(pm2opt) {
        if (lodash.isString(pm2opt)) procNames.push(pm2opt);
        if (lodash.isObject(pm2opt) && lodash.isString(pm2opt.name)) procNames.push(pm2opt.name);
      });
      return Promise.resolve(procNames);
    }
    return Promise.reject({
      reason: 'invalid-process-name'
    });
  }

  var applyAction = function(action, procNames) {
    if (lodash.isString(procNames)) return action(procNames);
    if (lodash.isArray(procNames)) {
      return Promise.mapSeries(procNames, action);
    }
    return Promise.reject({
      reason: 'invalid-process-name'
    });
  }

  var extractProcessInfo = function(proc) {
    proc = lodash.pick(proc, [
      'pid',
      'name',
      'pm2_env.HOME',
      'pm2_env.PWD',
      'pm2_env.USER',
      'pm2_env.SHELL',
      'pm2_env.TERM',
      'pm2_env.DISPLAY',
      'pm2_env.name',
      'pm2_env.exec_mode',
      'pm2_env.status',
      'pm2_env.pm_id',
      'pm2_env.pm_cwd',
      'pm2_env.pm_exec_path',
      'pm2_env.pm_pid_path',
      'pm2_env.pm_err_log_path',
      'pm2_env.pm_out_log_path',
      'pm2_env.pm_uptime',
      'pm2_env.exec_interpreter',
      'pm2_env.node_args',
      'pm2_env.instances',
      'pm2_env.instance_var',
      'pm2_env.NODE_APP_INSTANCE',
      'spawnfile',
      'exitCode',
      'signalCode',
      'killed',
      'connected'
    ]);
    proc.title = util.format("Application[%s] - PID[%s] is [%s]",
        proc.name, proc.pid, proc.pm2_env.status);
    return proc;
  }
}

// -- default instance --

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
