class Transaction {
  static add(t) {
    this.current = t;
    this.stack.push(t);
  }

  static remove() {
    this.stack.pop();
    this.current = this.stack[this.stack.length - 1];
  }

  static observe(model, prop) {
    if(this.current) {
      this.current.stack.push([model, prop]);
    }
  }

  constructor() {
    this.stack = [];
  }

  start() {
    Transaction.add(this);
  }

  stop() {
    Transaction.remove();
    return this.stack;
  }
}

Transaction.stack = [];

export default Transaction;

let stack = [];
let observing = false;
function transaction() {
  observing = true;
  return popResults;
}

function popResults() {
  observing = false;
  let o = stack;
  stack = [];
  return o;
}

function record(object, property) {
  if(observing) {
    stack.push([object, property]);
  }
}

export { transaction, record };
