let def = null;

if(typeof Reflect === 'object') {
  def = Reflect;
} else {
  def = {
    get: function(target, property, receiver) {
      let desc = Object.getOwnPropertyDescriptor(target, property);
      if(desc !== undefined && desc.get !== undefined) {
        return desc.get.call(receiver);
      }
      return target[property];
    }
  };
}

export default def;