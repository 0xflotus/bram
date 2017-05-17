import parse from './expression.js';
import { live, setupBinding, watch } from './bindings.js';
import { forEach } from './util.js';
import { ScopeReference } from './reference.js';
import {
  AttributeRender,
  ConditionalRender,
  EachRender,
  TextRender
} from './renders.js';

export default function inspect(node, ref, paths) {
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
            let ref = new ScopeReference(result, scope);
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
          let ref = new ScopeReference(result, scope);
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
        let ref = new ScopeReference(result, scope);
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
