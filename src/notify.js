import { getTag } from './tag.js';

export let observed = [];

export default function(obj, name){
  let tag = getTag(obj, name);
  tag.dirty();

  observed.forEach(function(renders) {
    for(var i = 0, len = renders.length; i < len; i++) {
      renders[i].rerender();
    }
  });
};