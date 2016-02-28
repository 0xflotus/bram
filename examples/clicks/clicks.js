var Bram = require('bram');

var h = Bram.h;
var compute = Bram.compute;

var count = compute(0);

var view = compute(function(){
  return h('div', [
    h('button', { type: 'button', onclick: function(){
      count(count()+1);
    }}, 'Click me'),
    h('h2', '' + count())
  ]);
});

Bram.mount('#app', view);
