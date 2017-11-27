
export default function(frag, parts){
  var document = frag.ownerDocument;
  var walker = document.createTreeWalker(frag, 133, null, false);
  var updaters = [];

  var index = -1, part;
  for (var i = 0; i < parts.length; i++) {
    part = parts[i];
    while (index < part.index) {
      index++;
      walker.nextNode();
    }
    updaters.push(part.update.bind(part, walker.currentNode));
  }

  return updaters;
};
