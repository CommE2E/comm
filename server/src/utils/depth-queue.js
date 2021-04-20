// @flow

class DepthQueue<T> {
  depthQueues: Map<number, Map<string, T>> = new Map();
  maxEnqueuedDepth: number = -1;
  maxDequeuedDepth: number = -1;
  getDepth: (a: T) => number;
  getKey: (a: T) => string;
  mergeFunction: (a: T, b: T) => T;

  constructor(
    getDepth: (a: T) => number,
    getKey: (a: T) => string,
    mergeFunction: (a: T, b: T) => T,
  ) {
    this.getDepth = getDepth;
    this.getKey = getKey;
    this.mergeFunction = mergeFunction;
  }

  addInfo(info: T) {
    const depth = this.getDepth(info);
    if (depth <= this.maxDequeuedDepth) {
      throw new Error(
        `try to addInfo at depth ${depth} after having dequeued at depth ` +
          this.maxDequeuedDepth,
      );
    }
    let map = this.depthQueues.get(depth);
    if (!map) {
      map = new Map();
      this.depthQueues.set(depth, map);
    }
    const key = this.getKey(info);
    const curInfo = map.get(key);
    const mergedInfo = curInfo ? this.mergeFunction(curInfo, info) : info;
    map.set(key, mergedInfo);
    if (depth > this.maxEnqueuedDepth) {
      this.maxEnqueuedDepth = depth;
    }
  }

  addInfos(infos: $ReadOnlyArray<T>) {
    for (const info of infos) {
      this.addInfo(info);
    }
  }

  getNextDepth(): ?(T[]) {
    let i = this.maxDequeuedDepth + 1;
    while (i <= this.maxEnqueuedDepth) {
      const depthMap = this.depthQueues.get(i++);
      if (!depthMap) {
        continue;
      }
      this.maxDequeuedDepth = i - 1;
      const result = [...depthMap.values()];
      this.depthQueues.delete(i - 1);
      return result;
    }
    return undefined;
  }

  empty(): boolean {
    for (let i = this.maxDequeuedDepth + 1; i <= this.maxEnqueuedDepth; i++) {
      if (this.depthQueues.has(i)) {
        return false;
      }
    }
    return true;
  }
}

export default DepthQueue;
