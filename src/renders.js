
class Render {
  constructor(ref, node) {
    this.ref = ref;
    this.node = node;
    this.lastTicket = null;
  }

  render() {
    this.lastTicket = this.ref.tag.value();
  }

  rerender() {
    if(!this.ref.validate(this.lastTicket)) {
      this.render();
    }
  }
}

class TextRender extends Render {
  render() {
    this.node.nodeValue = this.ref.value();
    super.render();
  }
}

class AttributeRender extends Render {
  constructor(ref, node, attrName) {
    super(ref, node);
    this.attrName = attrName;
  }

  render() {
    let val = this.ref.value();
    this.node.setAttribute(this.attrName, val);
    super.render();
  }
}

export { AttributeRender, TextRender };