// @flow

const removalDelay = 10000;

class ThreadWatcher {
  watchedIDs: Map<string, number> = new Map();
  pendingRemovals: Map<string, number> = new Map();

  watchID(id: string) {
    this.pendingRemovals.delete(id);
    const currentCount = this.watchedIDs.get(id);
    const nextCount = currentCount ? currentCount + 1 : 1;
    this.watchedIDs.set(id, nextCount);
  }

  removeID(id: string) {
    const currentCount = this.watchedIDs.get(id);
    if (!currentCount) {
      return;
    }
    const nextCount = currentCount - 1;
    this.watchedIDs.set(id, nextCount);
    if (nextCount === 0) {
      this.pendingRemovals.set(id, Date.now());
    }
  }

  getWatchedIDs(): string[] {
    const now = Date.now();
    for (const tuple of this.pendingRemovals) {
      if (tuple[1] + removalDelay > now) {
        continue;
      }
      this.pendingRemovals.delete(tuple[0]);
      this.watchedIDs.delete(tuple[0]);
    }
    return [...this.watchedIDs.keys()];
  }
}

const threadWatcher: ThreadWatcher = new ThreadWatcher();

export default threadWatcher;
