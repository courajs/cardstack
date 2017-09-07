const {spawn} = require('child_process');
const crypto = require('crypto');
const Koa = require('koa');
const proxy = require('koa-proxy');

module.exports = function() {
  let key = crypto.randomBytes(32).toString('base64');

  spawn('docker', [
    'run',
    '-d',
    '--label', 'com.cardstack',
    '--network', 'other',
    '--publish', '3000:3000',
    '-e', `CARDSTACK_SESSIONS_KEY=${key}`,
    'cardstack-app'
  ], {
    stdio: 'inherit'
  });

  let app = new Koa();
  app.use(proxy({
    host: 'http://localhost:3000'
  }));
  return app.callback();
}
