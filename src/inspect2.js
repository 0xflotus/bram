import { parse } from './expression.js';
import { forEach } from './util.js';
import * as live from './live2.js';
import Part from './part.js';

export default function inspect(node) {
  var document = node.ownerDocument;
  var walker = document.createTreeWalker(node, 133, null, false);
  var parts = [];

  var ignoredAttrs = Object.create(null);
  var index = -1, currentNode;
  while(walker.nextNode()) {
    index++;
    currentNode = walker.currentNode;
    switch(currentNode.nodeType) {
      // Element
      case 1:
        var templateAttr;
        if(currentNode.nodeName === 'TEMPLATE' &&
          (templateAttr = specialTemplateAttr(currentNode))) {
          var attrValue = currentNode.getAttribute(templateAttr);
          if(attrValue[0] !== "{") {
            attrValue = "{{" + attrValue + "}}"
          }
          var result = parse(attrValue);
          result.throwIfMultiple();
          ignoredAttrs[templateAttr] = true;

          var updateFn = templateAttr === 'each' ? live.each : live.cond;
          parts.push(new Part(index, updateFn));
        }

        forEach.call(currentNode.attributes, function(attrNode){
          if(ignoredAttrs[attrNode.name])
            return;

          var name = attrNode.name;
          var property = propAttr(name);
          var result = parse(attrNode.value);
          if(result.hasBinding) {
            if(property) {
              currentNode.removeAttribute(name);
              parts.push(new Part(index, live.prop));
            } else {
              parts.push(new Part(index, live.attr));
            }
          } else if(property) {
            currentNode.removeAttribute(name);
            parts.push(new Part(index, live.prop));
          } else if(name.substr(0, 3) === 'on-') {
            var eventName = name.substr(3);
            currentNode.removeAttribute(name);
            parts.push(new Part(index, live.event));
          }
        });

        break;
      // TextNode
      case 3:
        var result = parse(currentNode.nodeValue);
        if(result.hasBinding) {
          parts.push(new Part(index, live.text.bind(null, result)));
        }
        break;
    }
  }

  return parts;
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
