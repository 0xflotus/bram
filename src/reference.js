import { CompoundTag, getTag } from './tag.js';
import { transaction } from './transaction.js';

class Reference {
  constructor(expr, scope) {
    this.expr = expr;
    this.scope = scope;
    this._tag = null;
    this._checked = false;
  }

  get tag() {
    if(this._tag === null) {
      let name = this.expr.props()[0];
      let lookup = this.scope.read(name);
      this._tag = getTag(lookup.model, name);
    }
    return this._tag;
  }

  validate(ticket) {
    return this.tag.value() === ticket;
  }

  current() {
    return this.expr.getValue(this.scope);
  }

  value() {
    if(!this._checked) {
      this._checked = true;
      let t = transaction();
      let val = this.current();
      let parents = t();
      if(parents.length > 1) {
        this._tag = new CompoundTag(parents)
      }
      return val;
    } else {
      return this.current();
    }    
  }
}

export { Reference };