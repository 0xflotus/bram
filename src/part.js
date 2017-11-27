
class Part {
  constructor(index, updater) {
    this.index = index;
    this.updater = updater;
  }

  update(node, data) {
    // call updater on the data
    this.updater(node, data);
  }
}

export default Part;
