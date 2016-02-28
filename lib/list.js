var compute = require('ccompute');
var LEN = require('./sym')('[[bram-length]]');

function getLen(obj){
  return obj[LEN];
}

function List(vals){
  this[LEN] = compute(0);

  if(vals) {
    var self = this;
    vals.forEach(function(val){
      self.push(val);
    });
  }
}

Object.defineProperty(List.prototype, 'length', {
  get: function(){
    return getLen(this)();
  },
  set: function(val){
    getLen(this)(val);
  }
});

Object.getOwnPropertyNames(Array.prototype)
  .filter(function(prop) { return prop !== 'constructor'; })
  .forEach(function(prop){
    var val = Array.prototype[prop];
    if(typeof val === 'function') {
      List.prototype[prop] = val;
    }
  });

module.exports = function(vals){
  return new List(vals);
};
