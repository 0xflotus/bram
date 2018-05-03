(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.Bram = factory());
}(this, (function () { 'use strict';

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

function observe$1(o, fn) {
  var proxy = new Proxy(o, {
    get: function(target, property) {
      Transaction.observe(proxy, property);
      return target[property];
    },
    set: function(target, property, value) {
      var oldValue = target[property];
      if(!isModel$1(value) && isArrayOrObject(value)) {
        value = toModel$1(value);
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

var toModel$1 = function(o, skipClone){
  if(isModel$1(o)) return o;

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

  return observe$1(o, callback);
};

function deepModel(o, skipClone) {
  return !o ? o : Object.keys(o).reduce(function(acc, prop){
    var val = o[prop];
    acc[prop] = (Array.isArray(val) || typeof val === 'object')
      ? toModel$1(val)
      : val;
    return acc;
  }, o);
}

var isModel$1 = function(object){
  return object && !!object[events];
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

  eachModel(callback) {
    let scope = this;

    do {
      callback(scope.model);
      scope = scope.parent;
    } while(scope);
  }

  add(object){
    var model;
    if(isModel$1(object)) {
      model = object;
    } else {
      var type = typeof object;
      if(Array.isArray(object) || type === "object") {
        model = toModel$1(object);
      } else {
        model = object;
      }
    }

    return new Scope(model, this);
  }
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
class TemplateProcessor {
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
const partOpenRe = /{{/g;
const partCloseRe = /}}/g;
const parse = (templateString) => {
    const strings = [];
    const expressions = [];
    const boundaryIndex = templateString.length + 1;
    let lastExpressionIndex = partOpenRe.lastIndex =
        partCloseRe.lastIndex = 0;
    while (lastExpressionIndex < boundaryIndex) {
        const openResults = partOpenRe.exec(templateString);
        if (openResults == null) {
            strings.push(templateString.substring(lastExpressionIndex, boundaryIndex));
            break;
        }
        else {
            const openIndex = openResults.index;
            partCloseRe.lastIndex = partOpenRe.lastIndex = openIndex + 2;
            const closeResults = partCloseRe.exec(templateString);
            if (closeResults == null) {
                strings.push(templateString.substring(lastExpressionIndex, boundaryIndex));
            }
            else {
                const closeIndex = closeResults.index;
                strings.push(templateString.substring(lastExpressionIndex, openIndex));
                expressions.push(templateString.substring(openIndex + 2, closeIndex));
                lastExpressionIndex = closeIndex + 2;
            }
        }
    }
    return [strings, expressions];
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
class TemplateRule {
    constructor(nodeIndex) {
        this.nodeIndex = nodeIndex;
    }
}
class NodeTemplateRule extends TemplateRule {
    constructor(nodeIndex, expression) {
        super(nodeIndex);
        this.nodeIndex = nodeIndex;
        this.expression = expression;
    }
}
class AttributeTemplateRule extends TemplateRule {
    constructor(nodeIndex, attributeName, strings, expressions) {
        super(nodeIndex);
        this.nodeIndex = nodeIndex;
        this.attributeName = attributeName;
        this.strings = strings;
        this.expressions = expressions;
    }
}
class InnerTemplateRule extends NodeTemplateRule {
    constructor(nodeIndex, template) {
        super(nodeIndex, template.getAttribute('expression') || '');
        this.nodeIndex = nodeIndex;
        this.template = template;
    }
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
// Edge needs all 4 parameters present; IE11 needs 3rd parameter to be null
const createTreeWalker = (node) => document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);
class TemplateDefinition {
    constructor(template) {
        this.template = template;
        this.parseAndGenerateRules();
    }
    cloneContent() {
        return this.parsedTemplate.content.cloneNode(true);
    }
    parseAndGenerateRules() {
        const { template } = this;
        const content = template.content.cloneNode(true);
        const rules = [];
        const mutations = [];
        const walker = createTreeWalker(content);
        let nodeIndex = -1;
        while (walker.nextNode()) {
            nodeIndex++;
            const node = walker.currentNode;
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (!node.hasAttributes()) {
                    continue;
                }
                if (node instanceof HTMLTemplateElement) {
                    const { parentNode } = node;
                    const partNode = document.createTextNode('');
                    mutations.push(() => parentNode.replaceChild(partNode, node));
                    rules.push(new InnerTemplateRule(nodeIndex, node));
                }
                else {
                    const { attributes } = node;
                    // TODO(cdata): Fix IE/Edge attribute order here
                    // @see https://github.com/Polymer/lit-html/blob/master/src/lit-html.ts#L220-L229
                    for (let i = 0; i < attributes.length;) {
                        const attribute = attributes[i];
                        const { name, value } = attribute;
                        const [strings, values] = parse(value);
                        if (strings.length === 1) {
                            ++i;
                            continue;
                        }
                        rules.push(new AttributeTemplateRule(nodeIndex, name, strings, values));
                        node.removeAttribute(name);
                    }
                }
            }
            else if (node.nodeType === Node.TEXT_NODE) {
                const [strings, values] = parse(node.nodeValue || '');
                const { parentNode } = node;
                const document = node.ownerDocument;
                if (strings.length === 1) {
                    continue;
                }
                for (let i = 0; i < values.length; ++i) {
                    const partNode = document.createTextNode(strings[i]);
                    // @see https://github.com/Polymer/lit-html/blob/master/src/lit-html.ts#L267-L272
                    parentNode.insertBefore(partNode, node);
                    rules.push(new NodeTemplateRule(nodeIndex++, values[i]));
                }
                node.nodeValue = strings[strings.length - 1];
            }
        }
        // Execute mutations
        for (let fn of mutations) {
            fn();
        }
        this.rules = rules;
        this.parsedTemplate = document.createElement('template');
        this.parsedTemplate.content.appendChild(content);
    }
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
class TemplatePart {
    constructor(templateInstance, rule) {
        this.templateInstance = templateInstance;
        this.rule = rule;
    }
    get value() {
        return this.sourceValue;
    }
    set value(value) {
        if (value !== this.sourceValue) {
            this.sourceValue = value;
            this.applyValue(value);
        }
    }
}
class AttributeTemplatePart extends TemplatePart {
    constructor(templateInstance, rule, element) {
        super(templateInstance, rule);
        this.templateInstance = templateInstance;
        this.rule = rule;
        this.element = element;
    }
    clear() {
        this.element.removeAttribute(this.rule.attributeName);
    }
    applyValue(value) {
        if (value == null) {
            value = [];
        }
        else if (!Array.isArray(value)) {
            value = [value];
        }
        const { rule, element } = this;
        const { strings, attributeName } = rule;
        const valueFragments = [];
        for (let i = 0; i < (strings.length - 1); ++i) {
            valueFragments.push(strings[i]);
            valueFragments.push(value[i] || '');
        }
        const attributeValue = valueFragments.join('');
        if (attributeValue != null) {
            element.setAttribute(attributeName, attributeValue);
        }
        else {
            element.removeAttribute(attributeName);
        }
    }
}
class NodeTemplatePart extends TemplatePart {
    constructor(templateInstance, rule, startNode) {
        super(templateInstance, rule);
        this.templateInstance = templateInstance;
        this.rule = rule;
        this.startNode = startNode;
        this.currentNodes = [];
        this.move(startNode);
    }
    replace(...nodes) {
        this.clear();
        for (let i = 0; i < nodes.length; ++i) {
            let node = nodes[i];
            if (typeof node === 'string') {
                node = document.createTextNode(node);
            }
            // SPECIAL NOTE(cdata): This implementation supports NodeTemplatePart as
            // a replacement node. Usefulness TBD.
            if (node instanceof NodeTemplatePart) {
                const part = node;
                node = part.startNode;
                this.appendNode(node);
                part.move(node);
            }
            else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ||
                node.nodeType === Node.DOCUMENT_NODE) {
                // NOTE(cdata): Apple's proposal explicit forbid's document fragments
                // @see https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md
                throw new DOMException('InvalidNodeTypeError');
            }
            else {
                this.appendNode(node);
            }
        }
    }
    /**
     * Forks the current part, inserting a new part after the current one and
     * returning it. The forked part shares the TemplateInstance and the
     * TemplateRule of the current part.
     */
    fork() {
        const node = document.createTextNode('');
        this.parentNode.insertBefore(node, this.nextSibling);
        this.nextSibling = node;
        return new NodeTemplatePart(this.templateInstance, this.rule, node);
    }
    /**
     * Creates a new inner part that is enclosed completely by the current
     * part and returns it. The enclosed part shares the TemplateInstance and the
     * TemplateRule of the current part.
     */
    enclose() {
        const node = document.createTextNode('');
        this.parentNode.insertBefore(node, this.previousSibling.nextSibling);
        return new NodeTemplatePart(this.templateInstance, this.rule, node);
    }
    move(startNode) {
        const { currentNodes, startNode: currentStartNode } = this;
        if (currentStartNode != null &&
            currentStartNode !== startNode &&
            currentNodes.length) {
            this.clear();
        }
        this.parentNode = startNode.parentNode;
        this.previousSibling = startNode;
        this.nextSibling = startNode.nextSibling;
        this.startNode = startNode;
        if (currentNodes && currentNodes.length) {
            this.replace(...currentNodes);
        }
    }
    // SPECIAL NOTE(cdata): This clear is specialized a la lit-html to accept a
    // starting node from which to clear. This supports efficient cleanup of
    // subparts of a part (subparts are also particular to lit-html compared to
    // Apple's proposal).
    clear(startNode = this.previousSibling.nextSibling) {
        if (this.parentNode === null) {
            return;
        }
        let node = startNode;
        while (node !== this.nextSibling) {
            const nextNode = node.nextSibling;
            this.parentNode.removeChild(node);
            node = nextNode;
        }
        this.currentNodes = [];
    }
    appendNode(node) {
        this.parentNode.insertBefore(node, this.nextSibling);
        this.currentNodes.push(node);
    }
    applyValue(value) {
        if (this.currentNodes.length === 1 &&
            this.currentNodes[0].nodeType === Node.TEXT_NODE) {
            this.currentNodes[0].nodeValue = value;
        }
        else {
            this.replace(document.createTextNode(value));
        }
    }
}
class InnerTemplatePart extends NodeTemplatePart {
    constructor(templateInstance, rule, startNode) {
        super(templateInstance, rule, startNode);
        this.templateInstance = templateInstance;
        this.rule = rule;
        this.startNode = startNode;
    }
    get template() {
        return this.rule.template;
    }
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
class TemplateInstance extends DocumentFragment {
    constructor(definition, processor, state) {
        super();
        this.definition = definition;
        this.processor = processor;
        this.createdCallbackInvoked = false;
        this.previousState = null;
        this.appendChild(definition.cloneContent());
        this.generateParts();
        this.update(state);
    }
    update(state) {
        if (!this.createdCallbackInvoked) {
            this.processor.createdCallback(this.parts, state);
            this.createdCallbackInvoked = true;
        }
        this.processor.processCallback(this.parts, state);
        this.previousState = state;
    }
    generateParts() {
        const { definition } = this;
        const { rules } = definition;
        const parts = [];
        const walker = createTreeWalker(this);
        let walkerIndex = -1;
        for (let i = 0; i < rules.length; ++i) {
            const rule = rules[i];
            const { nodeIndex } = rule;
            while (walkerIndex < nodeIndex) {
                walkerIndex++;
                walker.nextNode();
            }
            const part = this.createPart(rule, walker.currentNode);
            parts.push(part);
        }
        this.parts = parts;
    }
    // NOTE(cdata): In the original pass, this was exposed in the
    // TemplateProcessor to be optionally overridden so that parts could
    // have custom implementations.
    createPart(rule, node) {
        if (rule instanceof AttributeTemplateRule) {
            return new AttributeTemplatePart(this, rule, node);
        }
        else if (rule instanceof InnerTemplateRule) {
            return new InnerTemplatePart(this, rule, node);
        }
        else if (rule instanceof NodeTemplateRule) {
            return new NodeTemplatePart(this, rule, node);
        }
        throw new Error(`Unknown rule type.`);
    }
}

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http:polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http:polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http:polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http:polymer.github.io/PATENTS.txt
 */
const templateDefinitionCache = new Map();
const createInstance = function (template, processor, state, overrideDefinitionCache = false) {
    if (processor == null) {
        throw new Error('The first argument of createInstance must be an implementation of TemplateProcessor');
    }
    if (!templateDefinitionCache.has(template) || overrideDefinitionCache) {
        templateDefinitionCache.set(template, new TemplateDefinition(template));
    }
    const definition = templateDefinitionCache.get(template);
    return new TemplateInstance(definition, processor, state);
};

var connectedInstance = function(instance, scope) {
  const update = () => instance.update(scope);

  Object.defineProperties(instance, {
    connect: {
      value() {
        scope.eachModel(model => connect(model, update));
      }
    },
    disconnect: {
      value() {
        scope.eachModel(model => disconnect(model, update));
      }
    }
  });

  return instance;
};

function createTemplate(selector) {
  let tmpl = typeof selector === 'string' ?
    document.querySelector(selector) : selector;

  return function(data){
    let scope = data;
    if(!(data instanceof Scope)) {
      scope = new Scope(data);
    }

    let processor = new BramProcessor();
    let instance = connectedInstance(
      createInstance(tmpl, processor, scope),
      scope
    );

    instance.connect();
    return instance;
  };
}

const propertyRule = {
  test(attrName) {
    return attrName.startsWith(':');
  },
  descriptors(attrName) {
    return {
      property: {
        value: attrName.substr(1)
      },
      isProp: {
        value: true
      }
    };
  }
};

const conditionalRule = {
  test(template) {
    return template.hasAttribute('if');
  },
  descriptors(template) {
    const key = template.getAttribute('if');
    return {
      isConditional: {
        value: true
      },
      isTruthy: {
        value(scope) {
          return !!scope.read(key).value;
        }
      },
      moveOnce: {
        value() {
          if(this._hasMoved) return;
          if(this.startNode.parentNode.nodeType !== 11) {
            this.move(this.startNode);
            this._hasMoved = true;
          }
        }
      }
    };
  }
};

class BramProcessor extends TemplateProcessor {
  constructor() {
    super();
    this._bramParts = new Map();
  }

  createdCallback(parts, state) {
    for(const part of parts) {
      let rule = part.rule;
      if(rule.attributeName) {
        if(propertyRule.test(rule.attributeName)) {
          let desc = propertyRule.descriptors(rule.attributeName);
          let newPart = Object.create(part, desc);
          this._bramParts.set(part, newPart);
          continue;
        }
      }
      else if(rule.template) {
        if(conditionalRule.test(rule.template)) {
          let desc = conditionalRule.descriptors(rule.template);
          let newPart = Object.create(part, desc);
          newPart.move(newPart.startNode);
          this._bramParts.set(part, newPart);
          continue;
        }
      }
      this._bramParts.set(part, part);
    }
  }
 
  processCallback(parts, scope) {
    for (const localPart of parts) {
      const part = this._bramParts.get(localPart);
      if (part instanceof InnerTemplatePart) {
        if(part.isConditional) {
          if(part.isTruthy(scope)) {
            if(!part.meta) {
              part.moveOnce();
              let newScope = scope.add({});
              let instance = createTemplate(part.template)(newScope);
              part.replace.apply(part, Array.from(instance.childNodes));
              
              part.meta = { instance, scope: newScope };
            } else {
              const { instance, scope } = part.meta;
              instance.update(scope);
            }
          } else {
            if(part.meta) {
              part.moveOnce();
              let tn = part.startNode.ownerDocument.createTextNode('');
              part.replace(tn);
              part.meta = null;
            }
          }
        }
      }
      else if (part instanceof NodeTemplatePart) {
        const { expression } = part.rule;
        if(scope && expression) {
          part.value = scope.read(expression).value;
        }
      }
      else if (part.isProp) {
        const { expressions } = part.rule;
        const element = part.element;
        const value = scope.read(expressions[0]).value;
        Reflect.set(element, part.property, value);
      }
      else if (part instanceof AttributeTemplatePart) {
        const { expressions } = part.rule;
        if(scope && expressions) {
          part.value = expressions.map(expression => (
            scope.read(expression).value
          ));
        }
      }
    }
  }
}

function Bram$1(Element) {
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

var Element = Bram$1(HTMLElement);
Bram$1.Element = Element;
Bram$1.model = toModel;
//Bram.on = on;
//Bram.off = off;
Bram$1.template = createTemplate;

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
