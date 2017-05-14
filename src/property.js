import { symbol } from './util.js';

let globalId = 0;
const _prop = symbol('bramProp');

class Property {
  static for(obj, name) {
    let props = obj[_prop];
    if(!props) {
      props = obj[_prop] = Object.create(null);
      props[name] = new Property();
    } else if(!props[name]) {
      props[name] = new Property();
    }
    return props[name];
  }

  constructor() {
    this.id = ++globalId;
    this.tag = Date.now();
  }
}

export default Property;