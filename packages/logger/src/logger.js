const {formatMessage} = require('./format');

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'none'];

class Logger {
  constructor(name, level, config={}) {
    this.name = name;
    this.level = level;

    let {
      color,
      formatters,
      interactive,
      log,
      timestamps
    } = config;
    this.color = color;
    this.formatters = formatters;
    this.interactive = interactive;
    this.timestamps = timestamps;
    this._log = log;
    this._lastTimestamp = new Date();
  }

  get level() {
    return levels[this._level];
  }

  set level(newLevel) {
    this._level = levels.indexOf(newLevel);
  }

  _doLog() {
    let args = Array.from(arguments);

    let now = new Date();
    let prev = this._lastTimestamp;
    this._lastTimestamp = now;

    let opts = {
      formatters: this.formatters,
      interactive: this.interactive
    };
    if (this.interactive) {
      opts.color = this.color;
    }

    if (this.timestamps) {
      // dates are diffs for interactive, timestamps for non-tty
      if (this.interactive) {
        opts.diff = now - prev;
      } else {
        opts.timestamp = now;
      }
    }

    let message = formatMessage(Array.from(arguments), this.name, opts);

    this._log(message);
  }

  // log.log always outputs, for development stuff only
  log() {
    this._doLog(...arguments);
  }
};

// adds log.trace, log.debug, etc.
// we slice() so we don't add a "none" method
for (let i in levels.slice(0, -1)) {
  Logger.prototype[levels[i]] = function() {
    if (i >= this._level) {
      this._doLog(...arguments);
    }
  }
}

module.exports = Logger;