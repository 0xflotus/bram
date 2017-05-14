import Base from './base.js';

export default class extends Base {
  update() {
    this.node.nodeValue = this.getValue();
  }
}