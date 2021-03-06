/* eslint-env node */

module.exports = [
  {
    type: 'plugin-configs',
    id: '@cardstack/ephemeral',
    attributes: {
      module: '@cardstack/ephemeral'
    }
  },
  {
    type: 'data-sources',
    id: 'default',
    attributes: {
      'source-type': '@cardstack/ephemeral'
    }
  },
  {
    type: 'plugin-configs',
    id: '@cardstack/hub',
    attributes: {
      module: '@cardstack/hub'
    },
    relationships: {
      'default-data-source': {
        data: { type: 'data-sources', id: 'default' }
      }
    }
  }
];
