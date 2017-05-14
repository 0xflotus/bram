export default class {
  constructor(node, prop, scope, expr) {
    this.node = node;
    this.prop = prop;
    this.scope = scope;
    this.expr = expr;
  }

  is(id) {
    return this.prop.id === id;
  }

  dirty(tag) {
    return tag > this.prop.tag;
  }

  getValue() {
    return this.expr.getValue(this.scope);
  }
}