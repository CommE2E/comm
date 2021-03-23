// @flow

class SequentialPromiseResolver<Result> {
  onResolve: Result => mixed;
  promises: Array<Promise<?Result>> = [];
  currentlySpinning: boolean = false;

  constructor(onResolve: Result => mixed) {
    this.onResolve = onResolve;
  }

  add(promise: Promise<?Result>) {
    this.promises.push(promise);
    this.spinPromises();
  }

  async spinPromises() {
    if (this.currentlySpinning) {
      return;
    }
    this.currentlySpinning = true;

    let currentPromise = this.promises.shift();
    while (currentPromise) {
      const result = await currentPromise;
      if (result) {
        this.onResolve(result);
      }
      currentPromise = this.promises.shift();
    }
    this.currentlySpinning = false;
  }
}

export default SequentialPromiseResolver;
