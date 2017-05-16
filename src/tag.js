import { _tag } from './symbols.js';

let globalRevision = 0;

class Tag {
  constructor() {
    this.revision = globalRevision;
  }

  dirty() {
    this.revision = ++globalRevision;
  }

  value() {
    return this.revision;
  }
}

class CompoundTag {
  constructor(parents) {
    this.parents = parents.map(function(obs){
      return getTag(obs[0], obs[1]);
    });
  }

  value() {
    return this.parents.reduce(function(val, cur){
      let curValue = cur.value();
      return curValue > val ? curValue : val;
    }, 0);
  }
}

function getTag(obj, property) {
    let tags = obj[_tag];
    if(!tags) {
      tags = obj[_tag] = Object.create(null);
      tags[property] = new Tag();
    } else if(!tags[property]) {
      tags[property] = new Tag();
    }
    return tags[property];
}

export { CompoundTag, getTag };