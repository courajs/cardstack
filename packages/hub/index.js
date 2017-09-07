const { makeServer } = require('./main');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const Funnel = require('broccoli-funnel');
const log = require('@cardstack/plugin-utils/logger')('hub/main');
const BroccoliConnector = require('./broccoli-connector');
const startHub = require('./start-hub');

// TODO: move into configuration
const defaultBranch = 'master';

module.exports = {
  name: '@cardstack/hub',

  init() {
    this._super.init && this._super.init.apply(this, arguments);

    // We don't want to boot the hub multiple times, even if it gets
    // included by multiple addons. So we do a bit of global
    // coordination here and only the first instance takes effect.
    if (global.__cardstack_hub_running_in_ember_cli) {
      this._active = false;
      return;
    } else {
      global.__cardstack_hub_running_in_ember_cli = true;
      this._active = true;
    }
    this._broccoliConnector = new BroccoliConnector();
  },

  included(app){
    while (app.app) {
      app = app.app;
    }
    let env = app.env;
    this._super.apply(this, arguments);
    if (!this._active){ return; }

    // app.import('vendor/cardstack/generated.js');

    if (!process.env.ELASTICSEARCH_PREFIX) {
      process.env.ELASTICSEARCH_PREFIX = this.project.pkg.name.replace(/^[^a-zA-Z]*/, '').replace(/[^a-zA-Z0-9]/g, '_') + '_' + env;
    }

    // start spinning up the hub immediately, because our treeFor*
    // hooks won't resolve until the hub does its first codegen build,
    // and the middleware hooks won't run until after that.

    let seedPath = path.join(path.dirname(this.project.configPath()), '..', 'cardstack', 'seeds', env);
    let useDevDeps;
    if (env === 'test') {
      useDevDeps = true;
    } else {
      // if the hub is a runtime dependency, it should only load other
      // plugins that are also runtime dependencies. If it's a
      // devDependency, it will also load other plugins that are
      // devDependencies.
      let { pkg } = this.project;
      useDevDeps = !(pkg.dependencies && pkg.dependencies['@cardstack/hub']);
    }
    this._hubMiddleware = startHub();
  },

  buildError: function(error) {
    if (this._broccoliConnector) {
      this._broccoliConnector.buildFailed(error);
    }
  },

  postBuild: function(results) {
    if (this._broccoliConnector) {
      this._broccoliConnector.buildSucceeded(results);
    }
  },

  // treeForVendor() {
  //   if (!this._active){
  //     this._super.apply(this, arguments);
  //     return;
  //   }

  //   return new Funnel(this._broccoliConnector.tree, {
  //     srcDir: defaultBranch,
  //     destDir: 'cardstack'
  //   });
  // },

  // The serverMiddleware hook is well-behaved and will wait for us to
  // resolve a promise before moving on.
  async serverMiddleware({ app }) {
    if (!this._active){
      this._super.apply(this, arguments);
      return;
    }

    app.use('/cardstack', await this._hubMiddleware);
  },

  // testemMiddleware will not wait for a promise, so we need to
  // register something immediately. This is racy and makes it
  // possible for early requests to fail -- if that turns out to have
  // a practical effect we will need to queue requests here instead.
  testemMiddleware(app) {
    if (!this._active){
      this._super.apply(this, arguments);
      return;
    }

    let handler;
    this._hubMiddleware.then(
      h => { handler = h; },
      error => {
        log.error("Server failed to start. %s", error);
        handler = (req, res) => {
          res.status = 500;
          res.send("@cardstack/hub server failed to start due to exception: " + error);
          res.end();
        };
      }
    );
    app.use('/cardstack', (req, res) => {
      if (handler) {
        handler(req, res);
      } else {
        res.status = 500;
        res.send("Server not ready yet");
        res.end();
      }
    });
  }
};
