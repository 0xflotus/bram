var symbol = typeof Symbol === 'function' ? Symbol :
  function(str){ return '@@-' + str; };

var values = Object.values || function(obj){
  return Object.keys(obj).reduce(function(acc, key){
    acc.push(obj[key]);
    return acc;
  }, []);
};

var asap = typeof Promise === 'function' ? cb => Promise.resolve().then(cb) : cb => setTimeout(_ => cb(), 0);

var forEach = Array.prototype.forEach;
var some = Array.prototype.some;
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

var isSymbol = function(prop){
  return toString.call(prop) === '[object Symbol]';
};

export {
  asap,
  symbol,
  isSymbol,
  values,
  forEach,
  some,
  slice
}
