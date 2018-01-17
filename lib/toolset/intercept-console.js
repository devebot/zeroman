'use strict';

var intercept = require('intercept-stdout');
// var MuteStream = require('mute-stream');

var intercepted = false;

var interceptConsole = function(opts) {
  opts = opts || {};
  if (!intercepted) {
    intercepted = true;

    // var _stdout = process.stdout;
    // process.stdout = new MuteStream();
    // process.stdout.pipe(_stdout);
    // process.stdout.mute();

    // var _stderr = process.stderr;
    // process.stderr = new MuteStream();
    // process.stderr.pipe(_stderr);
    // process.stderr.mute();

    var consoleOutput = [];
    var terminator = intercept(function(linetext) {
        consoleOutput.push(linetext.trim());
        return null;
    });
    
    return function() {
      terminator();
      // process.stdout = _stdout;
      // process.stderr = _stderr;
      intercepted = false;
      return consoleOutput;
    }
  }
  return null;
}

module.exports = interceptConsole;
