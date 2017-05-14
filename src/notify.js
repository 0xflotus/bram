import Property from './property.js';

export let observed = [];

export default function(obj, name){
  let tag = Date.now();
  let prop = Property.for(obj, name);
  observed.forEach(function(bindings){
    for(var i = 0, len = bindings.length; i < len; i++) {
      let binding = bindings[i];
      if(binding.is(prop.id)) {
        binding.tag = tag;
        binding.update(tag);
      } else if(binding.dirty(tag)) {
        binding.tag = tag;
      } else {
        break;
      }
    }
  });
};