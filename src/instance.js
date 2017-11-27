import hydrate from './hydrate2.js';

class Instance {
  constructor(frag, parts) {
    this.tree = frag;
    this._updaters = hydrate(frag, parts);
  }

  update(scope) {
    this._updaters.forEach(function(updater){
      updater(scope);
    });
  }
}

export default Instance;
