import { getTag } from './tag.js';

export let observed = [];
let rafId = null;

export default function(obj, name){
  let tag = getTag(obj, name);
  tag.dirty();

  if(rafId === null) {
    rafId = requestAnimationFrame(rerender);
  }
};

function rerender() {
  rafId = null;
  observed.forEach(function(renders) {
    for(var i = 0, len = renders.length; i < len; i++) {
      renders[i].rerender();
    }
  });
}
