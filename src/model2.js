const _conn = Symbol('bram.connections');

function isModel(o) {
  return _conn in o;
}

function toModel(o) {
  if(isModel(o)) {
    return o;
  }

  o[_conn] = new Set();
  return observe(o);
}

function notify(o) {
  const connections = o[_conn];
  if(connections) {
    for(const fn of connections) {
      fn();
    }
  }
}

function observe(o) {
  return new Proxy(o, {
    set(target, key, value) {
      Reflect.set(target, key, value);
      notify(target);
      return true;
    },
    deleteProperty(target, key) {
      Reflect.deleteProperty(target, key);
      notify(target);
      return true;
    }
  });
}

function connect(o, callback) {
  const connections = o[_conn];
  if(connections) {
    connections.add(callback);
  }
}

function disconnect(o, callback) {
  const connections = o[_conn];
  if(connections) {
    connections.delete(callback);
  }
}

export {
  isModel,
  toModel,
  connect,
  disconnect
};
