var Bram = require('bram');

var h = Bram.h;
var compute = Bram.compute;

var form = {
  state: function(){
    return compute('');
  },

  view: function(state){
    var local = compute('');

    return compute(function(){
      return h('form', {
        onsubmit: function(e) {
          e.preventDefault();
          state(local());
          local('');
        }
      }, [
        h('input', { type: 'text', onchange: function(e){
          local(e.target.value);
        }, value: local(), placeholder: 'Go to the store' })
      ]);
    });
  }
};

var list = {
  state: function(){
    return Bram.list([ 'get stuff done' ]);
  },

  view: function(state){
    return compute(function(){
      var uls = state.map(function(item){
        return h('li', item);
      });
      return h('div', uls);
    });
  }
};

var app = {
  state: function(){
    var items = list.state();
    var newItem = form.state();

    newItem.bind('change', function(){
      items.push(newItem());
    });

    return {
      items: items,
      newItem: newItem
    };
  },

  view: function(state){
    var formView = form.view(state.newItem);
    var listView = list.view(state.items);

    return compute(function(){
      return h('div', [
        formView(),
        listView()
      ]);
    });
  }
};

Bram.mount('#app', app);
