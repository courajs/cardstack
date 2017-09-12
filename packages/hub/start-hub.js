const {spawn} = require('child_process');
const crypto = require('crypto');
const Koa = require('koa');
const proxy = require('koa-proxy');
const nssocket = require('nssocket');

module.exports = async function() {
  let key = crypto.randomBytes(32).toString('base64');

  let proc = spawn('docker', [
    'run',
    '-d',
    // '--rm',
    '--publish', '3000:3000',
    '--publish', '6785:6785',
    '--mount', 'type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock',
    '--mount', 'type=bind,src=/Users/aaron/dev/cardstack/packages/hub,dst=/hub/app/node_modules/@cardstack/hub',
    '-e', `CARDSTACK_SESSIONS_KEY=${key}`,
    'cardstack-app'
  ], {
    stdio: 'inherit'
  });

  await new Promise(function(resolve) {
    proc.on('exit', resolve);
  });

  let hub = new nssocket.NsSocket();
  hub.connect(6785);

  await new Promise(function(resolve) {
    hub.data('ready', resolve);
  });

  console.log('hub seems ready');
  setTimeout(function() {
    console.log("alright, that's enough, hub. Shut it down");
    hub.send('shutdown');
  }, 30 * 1000);

  let app = new Koa();
  app.use(proxy({
    host: 'http://localhost:3000'
  }));
  return app.callback();
}
