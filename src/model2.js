import { symbol as sym } from './util.js';

var MODEL = sym('bram.model');
var CHECKPOINT = sym('bram.checkpoint');

export function isModel(obj) {
  return !!(obj && obj[MODEL]);
}

export function toModel(obj) {
  if(isModel(obj)) return obj;

  var model = new Proxy(obj, {
    set: function(target, prop, value, receiver) {
      Reflect.set(target, prop, value, receiver);
      callCheckpoints(model);
    }
  });

  obj[MODEL] = true;
  obj[CHECKPOINT] = [];

  return model;
};

export function addCheckpoint(model, fn) {
  model[CHECKPOINT].push(fn);
};

function callCheckpoints(model) {
  var fns = model[CHECKPOINT];
  fns.forEach(function(fn){
    fn();
  });
}
