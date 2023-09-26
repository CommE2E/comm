// @flow

class SequentialPromiseResolver<Result> {
  onResolve: Result => Promise<mixed>;
  promises: Array<Promise<?Result>> = [];
  currentlySpinning: boolean = false;

  constructor(onResolve: Result => Promise<mixed>) {
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
      // It's important that we await in sequence here as the messages must be
      // delivered in order. For more context, see https://phab.comm.dev/D355
      const result = await currentPromise;
      if (result) {
        await this.onResolve(result);
      }
      currentPromise = this.promises.shift();
    }
    this.currentlySpinning = false;
  }
}

export default SequentialPromiseResolver;
