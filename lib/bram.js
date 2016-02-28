var diff = exports.diff = require('virtual-dom/diff');
var patch = exports.patch = require('virtual-dom/patch');
var createElement = exports.createElement = require('virtual-dom/create-element');

exports.h = require('virtual-dom/h');

exports.compute = require('ccompute');
exports.obs = require('./obs');
exports.list = require('./list');

// Asynchronously render
exports.render = function(view){
  var wait = require('can-wait');
  return wait(view).then(function(data){
    var tree = data.result;
    return tree;
  });
};

exports.mount = function(hostSelector, view){
  var host = document.querySelector(hostSelector);

  if(typeof view === 'object') {
    view = view.view(view.state());
  }

  var tree = view();
  var rootNode = createElement(tree);
  var inRender = false;
  host.appendChild(rootNode);

  view.bind('change', rerender);

  function rerender(){
    if(!inRender) {
      inRender = true;
      requestAnimationFrame(function(){
        var newTree = view();
        var patches = diff(tree, newTree);
        rootNode = patch(rootNode, patches);
        tree = newTree;
        inRender = false;
      });
    }
  }
};
