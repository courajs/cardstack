const {spawn} = require('child_process');
const getContainerId = require('docker-container-id');

const NETWORK_NAME = "cardstack-network";

module.exports = async function() {
  await ensureNetwork();
  // spawn('docker', [
  //     'run',
  //     '-d',
  //     '--rm',
  //     '--network', NETWORK_NAME,
  //     '--publish', '9200:9200',
  //     'cardstack/elasticsearch'
  // ]);
  // await timeout(1 * 1000);
  let proc = spawn('curl', ['http://elasticsearch:9200'], {stdio: 'inherit'});
  return new Promise(function(resolve) {
    proc.on('exit', resolve);
  });
}


function timeout(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
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
