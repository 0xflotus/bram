var bram = require('../../lib/bram');

var Person = bram.obs(['first', 'last'], {
  fullName: function(){
    return this.first + ' ' + this.last;
  }
});

var compute = bram.compute;
var h = bram.h;

var person = new Person({ first: '', last: '' });

var userView = compute(function(){
  return h('div', [
    h('span', ['Full name: ', h('span', person.fullName())])
  ]);

});

var formView = compute(function(){
  return h('form', [
    h('input', { type: 'text', placeholder: 'First name',
      onkeyup: function(e){
        person.first = e.target.value;
      } }),
    h('input', { type: 'text', placeholder: 'First name',
      onkeyup: function(e){
        person.last = e.target.value;
      } })
  ]);
});

var view = compute(function(){
  return h('div', [ userView(), formView() ]);
});

bram.mount("#app", view);
