'use strict';

var intercepted = false;

var stdInterceptor = function(opts) {
  opts = opts || {};
  if (!intercepted) {
    intercepted = true;

    var buffer = { stdout: [], stderr: [] };
    var terminator = intercept(
      function(textline) {
        buffer.stdout.push(opts.trim == false ? textline : textline.trim());
        return null;
      },
      function(textline) {
        buffer.stderr.push(opts.trim == false ? textline : textline.trim());
        return null;
      },
      opts);
    
    return function() {
      terminator();
      intercepted = false;
      return buffer;
    }
  }
  return null;
}

module.exports = stdInterceptor;

// Based on https://gist.github.com/benbuckman/2758563
var intercept = function (stdoutExtractor, stderrExtractor, opts) {
  opts = opts || {};
  stderrExtractor = stderrExtractor || stdoutExtractor;

  var old_stdout_write = process.stdout.write;
  var old_stderr_write = process.stderr.write;

  process.stdout.write = (function(write) {
    return function(string, encoding, fd) {
      var args = toArray(arguments);
      args[0] = interceptor(string, stdoutExtractor);
      if (opts.mute == false) {
        write.apply(process.stdout, args);
      }
    };
  }(process.stdout.write));

  process.stderr.write = (function(write) {
    return function(string, encoding, fd) {
      var args = toArray(arguments);
      args[0] = interceptor(string, stderrExtractor);
      if (opts.mute == false) {
        write.apply(process.stderr, args);
      }
    };
  }(process.stderr.write));

  function interceptor(string, transformer) {
    // only intercept the string
    var result = transformer(string);
    if (typeof result == 'string' && result !== string) {
      string = result.replace( /\n$/ , '' ) + (result && (/\n$/).test( string ) ? '\n' : '');
    }
    return string;
  }

  // puts back to original
  return function unhook() {
    process.stdout.write = old_stdout_write;
    process.stderr.write = old_stderr_write;
  };
};

var toArray = function(arrLikeObj) {
  return Array.prototype.slice.call(arrLikeObj);
};
