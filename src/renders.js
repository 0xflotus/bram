import { arrayChange } from './symbols.js';
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

export {
  AttributeRender,
  ConditionalRender,
  EachRender,
  TextRender
};