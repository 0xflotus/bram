var supportsSymbol = typeof Symbol === 'function';

module.exports = function(name){
  return supportsSymbol ? Symbol(name) : name;
};
