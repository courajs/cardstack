const Error = require('@cardstack/plugin-utils/error');

module.exports = class DataSource {
  constructor(model, plugins) {
    this.id = model.id;
    this.sourceType = model.attributes['source-type'];
    this._writer = null;
    this._params = Object.assign({ dataSource: this }, model.attributes.params);
    this._Writer = plugins.lookupFeatureFactory('writers', this.sourceType);
    this._writer = null;
    this._Indexer = plugins.lookupFeatureFactory('indexers', this.sourceType);
    this._indexer = null;
    this._Searcher = plugins.lookupFeatureFactory('searchers', this.sourceType);
    this._searcher = null;
    if (!this._Writer && !this._Indexer && !this._Searcher) {
      throw new Error(`${this.sourceType} is either missing or does not appear to be a valid data source plugin`);
    }
  }
  get writer() {
    if (!this._writer && this._Writer) {
      this._writer = this._Writer.create(this._params);
    }
    return this._writer;
  }
  get indexer() {
    if (!this._indexer && this._Indexer) {
      this._indexer = this._Indexer.create(this._params);
    }
    return this._indexer;
  }
  get searcher() {
    if (!this._searcher && this._Searcher) {
      this._searcher = this._Searcher.create(this._params);
    }
    return this._searcher;
  }
  async teardown() {
    if (this._writer && typeof this._writer.teardown === 'function') {
      await this._writer.teardown();
    }
    if (this._indexer && typeof this._indexer.teardown === 'function') {
      await this._indexer.teardown();
    }
    if (this._searcher && typeof this._searcher.teardown === 'function') {
      await this._searcher.teardown();
    }
  }
};
