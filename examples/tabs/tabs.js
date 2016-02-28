var Bram = require('bram');

var h = Bram.h;
var compute = Bram.compute;

function panel(text, visible){
  return h('div.panel', {
    style: { display: visible ? 'block' : 'none' }
  }, [ text ])
}

var selected = can.compute(0);

var view = compute(function(){
  var select = function(i){
    return function(){
      selected(i);
    };
  };
  var s = selected();

  var link = function(title, i){
    return h('a', { href: 'javascript://', onclick: select(i) }, title)
  };

  return h('div.tabs', [
    link('First', 0),
    link('Second', 1),

    panel('Hello first', s === 0),
    panel('Hello second', s === 1)
  ])
});

Bram.mount('#app', view);
