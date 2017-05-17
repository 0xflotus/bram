import { arrayChanges } from './model.js';
import stamp from './stamp.js';
import { slice } from './util.js';
import { ValueReference } from './reference.js';
import { getTag } from './tag.js';

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

class ItemRender extends Render {
  constructor(ref, node, eachRender) {
    super(ref, node);
    this.parentLink = eachRender.link;
    this.hydrate = eachRender.hydrate;
    this.placeholder = eachRender.placeholder;
  }

  sibling() {
    let index = this.ref.value().index;
    let parent = this.placeholder.parentNode;
    let sibling = this.placeholder.nextSibling;
    while(sibling && index) {
      sibling = sibling.nextSibling;
    }
    return sibling;
  }

  render() {
    let scope = this.ref.scope;
    let link = this.hydrate(scope);
    this.parentLink.add(link);
    let tree = link.tree;
    let parent = this.placeholder.parentNode;
    let sibling = this.sibling();
    
    if(sibling) {
      parent.insertBefore(tree, sibling);
    } else {
      parent.appendChild(tree);
    }

    super.render();
    /*

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
    */
  }
}

class EachRender extends Render {
  constructor(ref, node, link) {
    super(ref, node);
    this.link = link;
    this.hydrate = stamp(node);
    this.placeholder = document.createTextNode('');
    node.parentNode.replaceChild(this.placeholder, node);

    this.itemMap = new Map();
    this.indexMap = new Map();

    // TODO lazily do this maybe
    let prop = ref.expr.props()[0];
    this.list = ref.scope.read(prop).value;
    this.renders = null;
    this.next = null;
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

  rerender() {
    debugger;
    if(!this.ref.validate(this.lastTicket)) {
      this.render();
      return;
    }
    for(var i = 0, len = this.renders.length; i < len; i++) {
      this.renders[i].rerender();
    }
  }

  render() {
    this.renders = [];

    this.list.forEach(function(listItem, i){
      let parentScope = this.ref.scope;
      let item = { item: listItem, index: i};
      let scope = parentScope.add(item).add(item);
      let tag = getTag(this.list, i);
      let ref = new ValueReference(tag, scope, item);
      let render = new ItemRender(ref, this.placeholder, this);
      render.render();
      this.renders.push(render);
    }.bind(this));


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
    super.render();
  }
}

export {
  AttributeRender,
  ConditionalRender,
  EachRender,
  TextRender
};