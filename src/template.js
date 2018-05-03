import {
  default as createInstance,
  TemplateProcessor,
  NodeTemplatePart,
  AttributeTemplatePart,
  InnerTemplatePart
} from '@matthewp/template-instantiation';
import Scope from './scope.js';
import connectedInstance from './connected-instance.js';

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
}

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
};

export default createTemplate;
