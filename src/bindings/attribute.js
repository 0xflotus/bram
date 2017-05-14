import Base from './base.js';

export default class extends Base {
  constructor(attrName, node, prop, scope, expr) {
    super(node, prop, scope, expr);

    this.attrName = attrName;
  }

  update() {
    let value = this.getValue();
    this.node.setAttribute(this.attrName, value);
  }
}