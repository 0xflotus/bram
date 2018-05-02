import {
  default as createInstance,
  TemplateProcessor,
  NodeTemplatePart,
  AttributeTemplatePart,
  InnerTemplatePart
} from '@matthewp/template-instantiation';
import Scope from './scope.js';

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
};

export default createTemplate;
