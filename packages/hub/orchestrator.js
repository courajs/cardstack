const {spawn, exec} = require('child_process');
const getContainerId = require('docker-container-id');

const NETWORK_NAME = "cardstack-network";

module.exports = {
  start,
  stop
};

async function start() {
  await ensureNetwork();
  await ensureElasticsearch();
  let proc = spawn('curl', ['http://elasticsearch:9200'], {stdio: 'inherit'});
  return new Promise(function(resolve) {
    proc.on('exit', resolve);
  });
}

async function stop() {
  await destroyElasticsearch();
  await destroyNetwork();
}



function timeout(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

async function ensureElasticsearch() {
  spawn('docker', [
      'run',
      '-d',
      '--rm',
      '--network', NETWORK_NAME,
      '--network-alias', 'elasticsearch',
      '--label', 'com.cardstack.service=elasticsearch',
      '--publish', '9200:9200',
      'cardstack/elasticsearch'
  ]);
  return timeout(30 * 1000);
}

async function destroyElasticsearch() {
  let container_id = await getServiceContainerId();
  console.log('container id', container_id);
  console.log(['docker', 'stop', container_id].join(' '));

  return new Promise(function(resolve, reject) {
    let proc = spawn('docker', [
        'stop', container_id
    ], { stdio: 'inherit' });
    proc.on('exit', resolve);
  });
}

function getServiceContainerId() {
  return new Promise(function(resolve, reject) {
    exec(
      'docker ps -q -f "label=com.cardstack.service=elasticsearch"',
      function(err, output) {
        if (err) {
          reject(err);
        } else {
          resolve(output.trim());
        }
      }
    );
  });
}

async function ensureNetwork() {
  await new Promise(function(resolve) {
    let proc = spawn('docker', [
        'network', 'create', NETWORK_NAME
    ], {stdio: 'inherit'});
    proc.on('exit', resolve);
  });

  let own_id = await getContainerId();

  await new Promise(function(resolve) {
    let proc = spawn('docker', [
        'network', 'connect', NETWORK_NAME, own_id
    ], {stdio: 'inherit'});
    proc.on('exit', resolve);
  });
}

async function destroyNetwork() {
  let own_id = await getContainerId();

  await new Promise(function(resolve) {
    let proc = spawn('docker', [
        'network', 'disconnect', NETWORK_NAME, own_id
    ], {stdio: 'inherit'});
    proc.on('exit', resolve);
  });

  await new Promise(function(resolve) {
    let proc = spawn('docker', [
        'network', 'rm', NETWORK_NAME
    ], {stdio: 'inherit'});
    proc.on('exit', resolve);
  });
}
