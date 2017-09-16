const Koa = require('koa');
const nssocket = require('nssocket');
const { Registry, Container } = require('@cardstack/di');
const orchestrator = require('./orchestrator');
const _ = require('lodash');


const logger = require('@cardstack/plugin-utils/logger');
const log = logger('server');

const HUB_HEARTBEAT_TIMEOUT = 7 * 1000;

async function wireItUp(projectDir, encryptionKeys, seedModels, opts = {}) {
  let registry = new Registry();
  registry.register('config:project', {
    path: projectDir,
    allowDevDependencies: opts.allowDevDependencies,
    emberConfigEnv: opts.emberConfigEnv
  });
  registry.register('config:seed-models', seedModels);
  registry.register('config:encryption-key', encryptionKeys);

  let container = new Container(registry);

  // in the test suite we want more deterministic control of when
  // indexing happens
  if (!opts.disableAutomaticIndexing) {
    await container.lookup('hub:indexers').update();
    setInterval(() => container.lookup('hub:indexers').update(), 600000);
  }

  // this registration pattern is how we make broccoli wait for our
  // asynchronous startup stuff before running the first build.
  if (opts.broccoliConnector) {
    opts.broccoliConnector.setSource(container.lookup('hub:code-generators'));
  }

  return container;
}

async function makeServer(projectDir, encryptionKeys, seedModels, opts = {}) {
  let orchestration = Promise.resolve();

  if (opts.orchestrator) {
    orchestration = orchestrator.start();
  }

  if (opts.emberConnector) {
    console.log('WAITING FOR EMBER CONNECTION');
    var server = nssocket.createServer(async function (socket) {
      console.log('connection established from ember-cli');
      await orchestration;

      console.log('orchestration finished');
      socket.data('shutdown', orchestrator.stop);

      // set up heartbeat
      console.log('setting up heartbeat');
      let stopLater = _.debounce(async function() {
        await orchestration;
        console.log('no heartbeat!! shutting down');
        orchestrator.stop();
      }, HUB_HEARTBEAT_TIMEOUT);
      socket.data('heartbeat', function() {
        console.log('heard heartbeat');
        stopLater();
      });
      stopLater();

      console.log('sending ready');
      socket.send('ready');
    });
    server.listen(6785);
  }

  await orchestration;


  let container = await wireItUp(projectDir, encryptionKeys, seedModels, opts);
  let app = new Koa();
  app.use(httpLogging);
  app.use(container.lookup('hub:middleware-stack').middleware());


  return app;
}

async function httpLogging(ctxt, next) {
  log.info('start %s %s', ctxt.request.method, ctxt.request.originalUrl);
  await next();
  log.info('finish %s %s %s', ctxt.request.method, ctxt.request.originalUrl, ctxt.response.status);
}

exports.wireItUp = wireItUp;
exports.makeServer = makeServer;
