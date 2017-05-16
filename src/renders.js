import stamp from './stamp.js';
import { slice } from './util.js';

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

export { AttributeRender, ConditionalRender, TextRender };