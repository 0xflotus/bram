import createInstance, { AttributeTemplatePart, InnerTemplatePart, NodeTemplatePart, TemplateProcessor } from '@matthewp/template-instantiation';

var symbol = typeof Symbol === 'function' ? Symbol :
  function(str){ return '@@-' + str; };

var asap = typeof Promise === 'function' ? cb => Promise.resolve().then(cb) : cb => setTimeout(_ => cb(), 0);

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

function isArraySet(object, property){
  return Array.isArray(object) && !isNaN(+property);
}

function isArrayOrObject(object) {
  return Array.isArray(object) || typeof object === 'object';
}

function observe(o, fn) {
  var proxy = new Proxy(o, {
    get: function(target, property) {
      Transaction.observe(proxy, property);
      return target[property];
    },
    set: function(target, property, value) {
      var oldValue = target[property];
      if(!isModel(value) && isArrayOrObject(value)) {
        value = toModel(value);
      }
      target[property] = value;

      // If the value hasn't changed, nothing else to do
      if(value === oldValue)
        return true;

      if(isArraySet(target, property)) {
        fn({
          prop: arrayChange,
          index: +property,
          type: 'set'
        }, value);
      } else {
        fn({
          prop: property,
          type: 'set'
        }, value);
      }

      return true;
    },
    deleteProperty: function(target, property, value){
      if(isArraySet(target, property)) {
        fn({
          prop: arrayChange,
          index: +property,
          type: 'delete'
        });
      }

      return true;
    }
  });
  return proxy;
}

var events = symbol('bram-events');
var arrayChange = symbol('bram-array-change');

var toModel = function(o, skipClone){
  if(isModel(o)) return o;

  o = deepModel(o, skipClone) || {};

  var callback = function(ev, value){
    var fns = o[events][ev.prop];
    if(fns) {
      fns.forEach(function(fn){
        fn(ev, value);
      });
    }
  };

  Object.defineProperty(o, events, {
    value: {},
    enumerable: false
  });

  return observe(o, callback);
};

function deepModel(o, skipClone) {
  return !o ? o : Object.keys(o).reduce(function(acc, prop){
    var val = o[prop];
    acc[prop] = (Array.isArray(val) || typeof val === 'object')
      ? toModel(val)
      : val;
    return acc;
  }, o);
}

var isModel = function(object){
  return object && !!object[events];
};

var on = function(model, prop, callback){
  var evs = model[events];
  if(!evs) return;
  var ev = evs[prop];
  if(!ev) {
    ev = evs[prop] = [];
  }
  ev.push(callback);
};

var off = function(model, prop, callback){
  var evs = model[events];
  if(!evs) return;
  var ev = evs[prop];
  if(!ev) return;
  var idx = ev.indexOf(callback);
  if(idx === -1) return;
  ev.splice(idx, 1);
  if(!ev.length) {
    delete evs[prop];
  }
};

class Scope {
  constructor(model, parent) {
    this.model = model;
    this.parent = parent;
  }

  read(prop){
    return this._read(prop) || {
      model: this.model,
      value: undefined
    };
  }

  readInTransaction(prop) {
    var transaction = new Transaction();
    transaction.start();
    var info = this.read(prop);
    info.reads = transaction.stop();
    return info;
  }

  _read(prop){
    var model = this.model;
    var val = model[prop];
    if(val == null) {
      // Handle dotted bindings like "user.name"
      var parts = prop.split(".");
      if(parts.length > 1) {
        do {
          val = model[parts.shift()];
          if(parts.length) {
            model = val;
          }
        } while(parts.length && val);
      }
    }
    if(val != null) {
      return {
        model: model,
        value: val
      };
    }
    if(this.parent) {
      return this.parent.read(prop);
    }
  }

  add(object){
    var model;
    if(isModel(object)) {
      model = object;
    } else {
      var type = typeof object;
      if(Array.isArray(object) || type === "object") {
        model = toModel(object);
      } else {
        model = object;
      }
    }

    return new Scope(model, this);
  }
}

function createTemplate(selector) {
  let tmpl = typeof selector === 'string' ?
    document.querySelector(selector) : selector;

  return function(data){
    let scope = data;
    if(!(data instanceof Scope)) {
      scope = new Scope(data);
    }

    let processor = new BramProcessor();
    return createInstance(tmpl, processor, scope);
  };
}

class BramProcessor extends TemplateProcessor {
  createdCallback(_parts, _state) { }
  processCallback(parts, state) {
    for (const part of parts) {
      if (part instanceof InnerTemplatePart) {
        // TODO
      }
      else if (part instanceof NodeTemplatePart) {
        const { expression } = part.rule;
        part.value = state && expression && state[expression];
      }
      else if (part instanceof AttributeTemplatePart) {
        const { expressions } = part.rule;
        part.value = state && expressions &&
        expressions.map(expression => state && state[expression]);
      }
    }
  }
}

function Bram(Element) {
  return class extends Element {
    constructor() {
      super();

      var Element = this.constructor;
      this._hasRendered = false;

      // Initially an empty object
      this.model = {};

      this._hydrate = Element.template && createTemplate(Element.template);

      let events = Element.events;
      if(events && !Element._hasSetupEvents) {
        installEvents(Element);
      }

      let props = !Element._hasInstalledProps && Element.observedProperties;
      if(props) {
        Element._hasInstalledProps = true;
        installProps(Element, props, Element.observedAttributes);
      }
    }

    connectedCallback() {
      if(this._hydrate && !this._hasRendered) {
        if(!isModel(this.model)) {
          this.model = toModel(this.model);
        }

        let scope = new Scope(this).add(this.model);
        this._template = this._hydrate(scope);

        let renderMode = this.constructor.renderMode;
        if(renderMode === 'light') {
          this.innerHTML = '';
          this.appendChild(this._template);
        } else {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot.appendChild(this._template);
        }
        this._hasRendered = true;
      }

      if(this.childrenConnectedCallback) {
        this._disconnectChildMO = setupChildMO(this);
      }
    }

    disconnectedCallback() {
      if(this._disconnectChildMO) {
        this._disconnectChildMO();
      }
      if(this._link) {
        this._link.detach();
      }
    }

    attributeChangedCallback(name, oldVal, newVal) {
      var sa = this.constructor._syncedAttrs;
      var synced = sa && sa[name];
      if(synced && this[name] !== newVal) {
        this[name] = newVal;
      }
    }
  }
}

var Element = Bram(HTMLElement);
Bram.Element = Element;
Bram.model = toModel;
Bram.on = on;
Bram.off = off;
Bram.template = createTemplate;

function installEvents(Element) {
  Element._hasSetupEvents = true;
  Element.events.forEach(function(eventName){
    Object.defineProperty(Element.prototype, 'on' + eventName, {
      get: function(){
        return this['_on' + eventName];
      },
      set: function(fn){
        var prop = '_on' + eventName;
        var cur = this[prop];
        if(cur) {
          this.removeEventListener(eventName, cur);
        }
        this[prop] = fn;
        this.addEventListener(eventName, fn);
      }
    });
  });
}

function installProps(Element, props, attributes = []) {
  Element._syncedAttrs = {};
  var proto = Element.prototype;
  props.forEach(function(prop){
    var desc = Object.getOwnPropertyDescriptor(proto, prop);
    if(!desc) {
      var hasAttr = attributes.indexOf(prop) !== -1;
      if(hasAttr) {
        Element._syncedAttrs[prop] = true;
      }
      Object.defineProperty(proto, prop, {
        get: function() {
          return this.model[prop];
        },
        set: function(val) {
          this.model[prop] = val;
          if(hasAttr) {
            var cur = this.getAttribute(prop);
            if(typeof val === 'boolean') {
              if(val && cur !== '') {
                this.setAttribute(prop, '');
              } else if(cur === '' && !val) {
                this.removeAttribute(prop);
              }
              return;
            } else if(cur !== val) {
              this.setAttribute(prop, val);
            }
          }
        }
      });
    }
  });
}

var SUPPORTS_MO = typeof MutationObserver === 'function';

function setupChildMO(inst) {
  var cancelled = false;
  var report = function(){
    if(!cancelled) {
      inst.childrenConnectedCallback();
    }
  };

  if(!SUPPORTS_MO) {
    asap(report);
    return;
  }

  var mo = new MutationObserver(report);
  mo.observe(inst, { childList: true });

  if(inst.childNodes.length) {
    asap(report);
  }

  return function(){
    cancelled = true;
    mo.disconnect();
  };
}

export { Element };export default Bram;
