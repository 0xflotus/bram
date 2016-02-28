var c = require('ccompute');

var PROPS = require('./sym')('[[bram-prop]]');

function getProps(obj){
  return obj[PROPS];
}

module.exports = function(props, proto){
  var k = function(vals){
    vals = vals || {};
    var p = this[PROPS] = {};

    props.forEach(function(prop){
      p[prop] = c(vals[prop]);
    });
  };
  k.prototype = proto;

  props.forEach(function(prop){
    var compute = c();
    Object.defineProperty(proto, prop, {
      get: function() {
        return getProps(this)[prop]();
      },
      set: function(val){
        getProps(this)[prop](val);
      }
    });
  });

  return k;
};

