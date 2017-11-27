import hydrate from './hydrate2.js';
import inspect from './inspect.js';
import inspect2 from './inspect2.js';
import Instance from './instance.js';
import { addCheckpoint } from './model2.js';
import Link from './link.js';
import Scope from './scope2.js';

export default function(template){
  template = (template instanceof HTMLTemplateElement) ?
    template : document.querySelector(template);

  var parts = inspect2(template.content.cloneNode(true));

  return function(scope){
    if(!(scope instanceof Scope)) {
      scope = new Scope(scope);
    }

    var frag = document.importNode(template.content, true);
    var instance = new Instance(frag, parts);

    function updateInstance() {
      instance.update(scope);
    }

    scope.each(function(model){
      addCheckpoint(model, updateInstance);
    });

    // Do the initial update
    updateInstance();

    return instance;
  };
};
