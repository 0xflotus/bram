(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.Bram = factory());
}(this, (function () { 'use strict';

var symbol = typeof Symbol === 'function' ? Symbol :
  function(str){ return '@@-' + str; };

var values = Object.values || function(obj){
  return Object.keys(obj).reduce(function(acc, key){
    acc.push(obj[key]);
    return acc;
  }, []);
};

var asap = typeof Promise === 'function' ? cb => Promise.resolve().then(cb) : cb => setTimeout(_ => cb(), 0);

var forEach = Array.prototype.forEach;
var some = Array.prototype.some;
var slice = Array.prototype.slice;

const arrayChange = symbol('bram-array-change');
const _tag = symbol('bram-tag');

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

let observed = [];

var notify = function(obj, name){
  let tag = getTag(obj, name);
  tag.dirty();

  observed.forEach(function(renders) {
    for(var i = 0, len = renders.length; i < len; i++) {
      renders[i].rerender();
    }
  });
};

let def = null;

if(typeof Reflect === 'object') {
  def = Reflect;
} else {
  def = {
    get: function(target, property, receiver) {
      let desc = Object.getOwnPropertyDescriptor(target, property);
      if(desc !== undefined && desc.get !== undefined) {
        return desc.get.call(receiver);
      }
      return target[property];
    }
  };
}

var Reflect$1 = def;

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

toModel = function(o){
  var m = new Proxy(o, {
    get: function(target, property){
      record(m, property);
      return Reflect$1.get(target, property, m);
    },
    set: function(target, property, value){
      target[property] = value;

      if(property === _tag) {
        return true;
      }

      if(isArraySet(target, property)) {
        target[arrayChange] = {
          index: +property,
          type: 'set'
        };
      }

      notify(m, property);
      return true;
    }
  });

  return m;
};

function Scope(model, parent) {
  this.model = model;
  this.parent = parent;
}

Scope.prototype.read = function(prop){
  return this._read(prop) || {
    model: this.model,
    value: undefined
  };
};

Scope.prototype.readInTransaction = function(prop) {
  var transaction$$1 = new Transaction();
  transaction$$1.start();
  var info = this.read(prop);
  info.reads = transaction$$1.stop();
  return info;
};

Scope.prototype._read = function(prop){
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
};

Scope.prototype.add = function(object){
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
};

function hydrate(link, callbacks, scope) {
  var paths = Object.keys(callbacks);
  var id = +paths.shift();
  var cur = 0;

  traverse(link.tree);

  function check(node) {
    cur++;
    if(id === cur) {
      var callback = callbacks[id];
      callback(node, scope, link);
      id = +paths.shift();
    }
    return !id;
  }

  function traverse(node){
    var exit;
    var attributes = slice.call(node.attributes || []);
    some.call(attributes, function(){
      exit = check(node);
      if(exit) {
        return true;
      }
    });
    if(exit) return false;

    some.call(node.childNodes, function(child){
      exit = check(child);
      if(exit) {
        return true;
      }

      exit = !traverse(child);
      if(exit) {
        return true;
      }
    });
    return !exit;
  }
}

function ParseResult(){
  this.values = {};
  this.raw = '';
  this.hasBinding = false;
  this.includesNonBindings = false;
}

ParseResult.prototype.getValue = function(scope){
  var prop = this.props()[0];
  return scope.read(prop).value;
};

ParseResult.prototype.getStringValue = function(scope){
  var asc = Object.keys(this.values).sort(function(a, b) {
    return +a > +b ? 1 : -1;
  });
  var out = this.raw;
  var i, value;
  while(asc.length) {
    i = asc.pop();
    value = scope.read(this.values[i]).value;
    if(value != null) {
      out = out.substr(0, i) + value + out.substr(i);
    }
  }
  return out;
};
ParseResult.prototype.compute = function(model){
  var useString = this.includesNonBindings || this.count() > 1;
  return useString
    ? this.getStringValue.bind(this, model)
    : this.getValue.bind(this, model);
};

ParseResult.prototype.props = function(){
  return values(this.values);
};

ParseResult.prototype.count = function(){
  return this.hasBinding === false ? 0 : Object.keys(this.values).length;
};

ParseResult.prototype.throwIfMultiple = function(msg){
  if(this.count() > 1) {
    msg = msg || 'Only a single binding is allowed in this context.';
    throw new Error(msg);
  }
};

function parse(str){
  var i = 0,
    len = str.length,
    result = new ParseResult(),
    inBinding = false,
    lastChar = '',
    pos = 0,
    char;

  while(i < len) {
    lastChar = char;
    char = str[i];

    if(!inBinding) {
      if(char === '{') {
        if(lastChar === '{') {
          result.hasBinding = true;
          pos = result.raw.length;
          if(result.values[pos] != null) {
            pos++;
          }
          result.values[pos] = '';
          inBinding = true;
        }

        i++;
        continue;
      } else if(lastChar === '{') {
        result.raw += lastChar;
      }
      result.raw += char;
    } else {
      if(char === '}') {
        if(lastChar === '}') {
          inBinding = false;
        }
        i++;
        continue;
      }
      result.values[pos] += char;
    }

    i++;
  }

  result.includesNonBindings = result.raw.length > 0;
  return result;
}

var live = {
  attr: function(node, attrName){
    return function(val){
      node.setAttribute(attrName, val);
    };
  },
  text: function(node){
    return function(val){
      node.nodeValue = val;
    };
  },
  prop: function(node, prop){
    return function(val){
      node[prop] = val;
    };
  },
  event: function(node, eventName, scope, parseResult, link){
    var prop = parseResult.raw;
    link.bind(node, eventName, function(ev){
      var readResult = scope.read(prop);
      readResult.value.call(readResult.model, ev);
    });
  },
  each: function(node, parentScope, parseResult, parentLink){
    var hydrate = stamp(node);
    var prop = parseResult.props()[0];
    var scopeResult = parentScope.read(prop);
    var placeholder = document.createTextNode('');
    node.parentNode.replaceChild(placeholder, node);

    var observe = function(list){
      var itemMap = new Map();
      var indexMap = new Map();

      var render = function(item, i){
        var scope = parentScope.add(item).add({ item: item, index: i});
        var link = hydrate(scope);
        parentLink.add(link);
        var tree = link.tree;

        var info = {
          item: item,
          link: link,
          nodes: slice.call(tree.childNodes),
          scope: scope,
          index: i
        };
        itemMap.set(item, info);
        indexMap.set(i, info);

        var siblingInfo = indexMap.get(i + 1);
        var parent = placeholder.parentNode;
        if(siblingInfo) {
          var firstChild = siblingInfo.nodes[0];
          parent.insertBefore(tree, firstChild);
        } else {
          parent.appendChild(tree);
        }
      };

      var remove = function(index){
        var info = indexMap.get(index);
        if(info) {
          info.nodes.forEach(function(node){
            node.parentNode.removeChild(node);
          });
          parentLink.remove(info.link);
          itemMap.delete(info.item);
          indexMap.delete(index);
        }
      };

      list.forEach(render);

      var onarraychange = function(ev, value){
        if(ev.type === 'delete') {
          remove(ev.index);
          return;
        }

        var info = itemMap.get(value);
        if(info) {
          var oldIndex = info.index;
          var hasChanged = oldIndex !== ev.index;
          if(hasChanged) {
            info.scope.model.index = info.index = ev.index;

            var existingItem = indexMap.get(ev.index);
            if(existingItem) {
              indexMap.set(oldIndex, existingItem);
            } else {
              indexMap.delete(oldIndex);
            }
            indexMap.set(ev.index, info);

            var ref = indexMap.get(ev.index + 1);
            if(ref) {
              ref = ref.nodes[0];
            }

            var nodeIdx = info.nodes.length - 1;
            while(nodeIdx >= 0) {
              placeholder.parentNode.insertBefore(info.nodes[nodeIdx], ref);
              nodeIdx--;
            }
          }
        } else {
          remove(ev.index);
          render(value, ev.index);
        }
      };

      parentLink.on(list, arrayChange, onarraychange);

      return function(){
        for(var i = 0, len = list.length; i < len; i++) {
          remove(i);
        }
        parentLink.off(list, arrayChange, onarraychange);
        itemMap = null;
        indexMap = null;
      };
    };

    var teardown = observe(scopeResult.value);

    parentLink.on(scopeResult.model, prop, function(ev, newValue){
      teardown();
      teardown = observe(newValue);
    });
  },
  if: function(node, parentScope, parentLink){
    var hydrate = stamp(node);
    var rendered = false;
    var child = {};
    var placeholder = document.createTextNode('');
    node.parentNode.replaceChild(placeholder, node);
    return function(val){
      if(!rendered) {
        if(val) {
          var scope = parentScope.add(val);
          var link = hydrate(scope);
          parentLink.add(link);
          var tree = link.tree;
          child.children = slice.call(tree.childNodes);
          child.scope = scope;
          placeholder.parentNode.insertBefore(tree, placeholder.nextSibling);
          rendered = true;
        }
      } else {
        var parent = placeholder.parentNode;
        var sibling = placeholder.nextSibling;
        if(val) {
          child.children.forEach(function(node){
            parent.insertBefore(node, sibling);
          });
        } else {
          child.children.forEach(function(node){
            parent.removeChild(node);
          });
        }
      }
    };
  }
};

function setupBinding(scope, parseResult, link, fn){
  var compute = parseResult.compute(scope);

  var set = function(){
    fn(compute());
  };

  parseResult.props().forEach(function(prop){
    var info = scope.readInTransaction(prop);
    var model = info.model;
    if(info.bindable !== false) {
      info.reads.forEach(function(read){
        link.on(read[0], read[1], set);
      });
    }
  });

  set();
}

function watch(render, link) {
  link.renders.push(render);
  render.render();
}

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
        this._tag = new CompoundTag(parents);
      }
      return val;
    } else {
      return this.current();
    }    
  }
}

class Render {
  constructor(ref, node) {
    this.ref = ref;
    this.node = node;
    this.lastTicket = null;
  }

  render() {
    this.lastTicket = this.ref.tag.value();
  }

  rerender() {
    if(!this.ref.validate(this.lastTicket)) {
      this.render();
    }
  }
}

class TextRender extends Render {
  render() {
    this.node.nodeValue = this.ref.value();
    super.render();
  }
}

class AttributeRender extends Render {
  constructor(ref, node, attrName) {
    super(ref, node);
    this.attrName = attrName;
  }

  render() {
    let val = this.ref.value();
    this.node.setAttribute(this.attrName, val);
    super.render();
  }
}

class ConditionalRender extends Render {
  constructor(ref, node, link) {
    super(ref, node);
    this.parentLink = link;
    this.hydrate = stamp(node);
    this.rendered = false;
    this.child = Object.create(null);
    this.placeholder = document.createTextNode('');
    node.parentNode.replaceChild(this.placeholder, node);
  }

  render() {
    var hydrate = this.hydrate;
    var rendered = this.rendered;
    var val = this.ref.value();
    var parentScope = this.ref.scope;
    var child = this.child;
    var placeholder = this.placeholder;
    if(!rendered) {
      if(val) {
        var scope = parentScope.add(val);
        var link = hydrate(scope);
        this.parentLink.add(link);
        var tree = link.tree;
        child.children = slice.call(tree.childNodes);
        child.scope = scope;
        placeholder.parentNode.insertBefore(tree,
          placeholder.nextSibling);
        this.rendered = true;
      }
    } else {
      var parent = placeholder.parentNode;
      var sibling = placeholder.nextSibling;
      if(val) {
        child.children.forEach(function(node){
          parent.insertBefore(node, sibling);
        });
      } else {
        child.children.forEach(function(node){
          parent.removeChild(node);
        });
      }
    }
    super.render();
  }
}

class EachRender extends Render {
  constructor(ref, node, link) {
    super(ref, node);
    this.parentLink = link;
    this.hydrate = stamp(node);
    this.placeholder = document.createTextNode('');
    node.parentNode.replaceChild(this.placeholder, node);

    this.itemMap = new Map();
    this.indexMap = new Map();

    // TODO lazily do this maybe
    let prop = ref.expr.props()[0];
    this.list = ref.scope.read(prop).value;
  }

  removeItem(index) {
    let info = this.indexMap.get(index);
    if(info) {
      info.nodes.forEach(function(node){
        node.parentNode.removeChild(node);
      });
      this.parentLink.remove(info.link);
      this.itemMap.delete(info.item);
      this.indexMap.delete(index);
    }
  }

  renderItem(item, i) {
    let parentScope = this.ref.scope;
    let scope = parentScope.add(item).add({ item: item, index: i});
    let link = this.hydrate(scope);
    this.parentLink.add(link);
    let tree = link.tree;

    let info = {
      item: item,
      link: link,
      nodes: slice.call(tree.childNodes),
      scope: scope,
      index: i
    };
    this.itemMap.set(item, info);
    this.indexMap.set(i, info);

    let siblingInfo = this.indexMap.get(i + 1);
    let parent = this.placeholder.parentNode;
    if(siblingInfo) {
      let firstChild = siblingInfo.nodes[0];
      parent.insertBefore(tree, firstChild);
    } else {
      parent.appendChild(tree);
    }
  }

  render() {
    let event = this.list[arrayChange];
    if(typeof event === 'object') {
      console.log('hello there');
    } else {
      let render = this.renderItem.bind(this);
      this.list.forEach(render);

      // Tag the list so we are informed of what happens.
      this.list[arrayChange] = true;
    }


    var observe = function(list){



      // DONE
      // var remove = function(index){
      //   var info = indexMap.get(index);
      //   if(info) {
      //     info.nodes.forEach(function(node){
      //       node.parentNode.removeChild(node);
      //     });
      //     parentLink.remove(info.link);
      //     itemMap.delete(info.item);
      //     indexMap.delete(index);
      //   }
      // };

      // DONE
      //list.forEach(render);

      var onarraychange = function(ev, value){
        if(ev.type === 'delete') {
          remove(ev.index);
          return;
        }

        var info = itemMap.get(value);
        if(info) {
          var oldIndex = info.index;
          var hasChanged = oldIndex !== ev.index;
          if(hasChanged) {
            info.scope.model.index = info.index = ev.index;

            var existingItem = indexMap.get(ev.index);
            if(existingItem) {
              indexMap.set(oldIndex, existingItem);
            } else {
              indexMap.delete(oldIndex);
            }
            indexMap.set(ev.index, info);

            var ref = indexMap.get(ev.index + 1);
            if(ref) {
              ref = ref.nodes[0];
            }

            var nodeIdx = info.nodes.length - 1;
            while(nodeIdx >= 0) {
              placeholder.parentNode.insertBefore(info.nodes[nodeIdx], ref);
              nodeIdx--;
            }
          }
        } else {
          remove(ev.index);
          render(value, ev.index);
        }
      };

      /*
      parentLink.on(list, arrayChange, onarraychange);

      return function(){
        for(var i = 0, len = list.length; i < len; i++) {
          remove(i);
        }
        parentLink.off(list, arrayChange, onarraychange);
        itemMap = null;
        indexMap = null;
      };
      */
    };

    /*var teardown = observe(scopeResult.value);

    parentLink.on(scopeResult.model, prop, function(ev, newValue){
      teardown();
      teardown = observe(newValue);
    });*/
  }
}

function inspect(node, ref, paths) {
  var ignoredAttrs = {};

  switch(node.nodeType) {
    // Element
    case 1:
      var templateAttr;
      if(node.nodeName === 'TEMPLATE' && (templateAttr = specialTemplateAttr(node))) {
        var result = parse(node.getAttribute(templateAttr));
        if(result.hasBinding) {
          result.throwIfMultiple();
          ignoredAttrs[templateAttr] = true;
          paths[ref.id] = function(node, scope, link){
            let ref = new Reference(result, scope);
            let render;
            if(templateAttr === 'each') {
              //live.each(node, scope, result, link);
              render = new EachRender(ref, node, link);
            } else {
              render = new ConditionalRender(ref, node, link);
              //setupBinding(model, result, link, live[templateAttr](node, model, link));
            }
            watch(render, link);
          };
        }
      }
      break;
    // TextNode
    case 3:
      var result = parse(node.nodeValue);
      if(result.hasBinding) {
        paths[ref.id] = function(node, scope, link){
          let ref = new Reference(result, scope);
          let render = new TextRender(ref, node);
          watch(render, link);
        };
      }
      break;
  }

  forEach.call(node.attributes || [], function(attrNode){
    // TODO see if this is important
    ref.id++;

    if(ignoredAttrs[attrNode.name])
      return;

    var name = attrNode.name;
    var property = propAttr(name);
    var result = parse(attrNode.value);
    if(result.hasBinding) {
      paths[ref.id] = function(node, model, link){
        if(property) {
          node.removeAttribute(name);
          setupBinding(model, result, link, live.prop(node, property));
          return;
        }

        let scope = model;
        let ref = new Reference(result, scope);
        let render = new AttributeRender(ref, node, name);
        watch(render, link);
      };
    } else if(property) {
      paths[ref.id] = function(node){
        node.removeAttribute(name);
        live.prop(node, property)(attrNode.value);
      };
    } else if(name.substr(0, 3) === 'on-') {
      var eventName = name.substr(3);
      paths[ref.id] = function(node, model, link){
        node.removeAttribute(name);
        live.event(node, eventName, model, result, link);
      };
    }
  });

  var childNodes = node.childNodes;
  forEach.call(childNodes, function(node){
    ref.id++;
    inspect(node, ref, paths);
  });

  return paths;
}

var specialTemplateAttrs = ['if', 'each'];
function specialTemplateAttr(template){
  var attrName;
  for(var i = 0, len = specialTemplateAttrs.length; i < len; i++) {
    attrName = specialTemplateAttrs[i];
    if(template.getAttribute(attrName))
      return attrName;
  }
}

function propAttr(name) {
  return (name && name[0] === ':') && name.substr(1);
}

class MapOfMap {
  constructor() {
    this.map = new Map();
  }

  set(key1, key2, val) {
    let map = this.map.get(key1);
    if(!map) {
      map = new Map();
      this.map.set(key1, map);
    }
    map.set(key2, val);
  }

  delete(key1, key2) {
    let map = this.map.get(key1);
    if(map) {
      map.delete(key2);
    }
  }
}

class Link {
  constructor(frag) {
    this.tree = frag;
    this.models = new MapOfMap();
    this.elements = new MapOfMap();
    this.renders = [];
    this.children = [];
  }

  loop(map, cb) {
    for(let [key, val] of map) {
      cb(key, val[0], val[1]);
    }
  }

  on(obj, event, fn, isModel$$1) {
    this.models.set(obj, event, fn);
    on(obj, event, fn);
  }

  off(obj, event, fn) {
    this.models.delete(obj, event);
    off(obj, event, fn);
  }

  bind(node, event, fn) {
    this.elements.set(node, event, fn);
    node.addEventListener(event, fn);
  }

  attach() {
    this.loop(this.models, on);
    this.children.forEach(function(link){
      link.attach();
    });
  }

  detach() {
    this.loop(this.models, off);
    this.children.forEach(function(link){
      link.detach();
    });
  }

  add(link) {
    this.children.push(link);
  }

  remove(link) {
    var idx = this.children.indexOf(link);
    this.children.splice(idx, 1);
  }
}

var stamp = function(template){
  template = (template instanceof HTMLTemplateElement) ? template : document.querySelector(template);
  var paths = inspect(template.content, {id:0}, {});

  return function(scope){
    if(!(scope instanceof Scope)) {
      scope = new Scope(scope);
    }

    var frag = document.importNode(template.content, true);
    var link = new Link(frag);
    observed.push(link.renders);
    hydrate(link, paths, scope);
    return link;
  };
};

function Bram$1(Element) {
  return class extends Element {
    constructor() {
      super();

      var Element = this.constructor;
      let tmpl = Element.template;
      if(tmpl) {
        this._hydrate = stamp(tmpl);
      }
      this._hasRendered = false;

      // Initially an empty object
      this.model = {};

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

        var scope = new Scope(this).add(this.model);
        this._link = this._hydrate(scope);
        var tree = this._link.tree;
        var renderMode = this.constructor.renderMode;
        if(renderMode === 'light') {
          this.innerHTML = '';
          this.appendChild(tree);
        } else {
          this.attachShadow({ mode: 'open' });
          this.shadowRoot.appendChild(tree);
        }
        this._hasRendered = true;
      } else if(this._hasRendered) {
        this._link.attach();
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

var Element = Bram$1(HTMLElement);
Bram$1.Element = Element;
Bram$1.model = toModel;
Bram$1.on = on;
Bram$1.off = off;
Bram$1.template = stamp;

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

return Bram$1;

})));
