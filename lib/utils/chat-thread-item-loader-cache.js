// @flow

import invariant from 'invariant';

type ChatThreadPointer =
  | {
      +resolved: true,
      +threadID: string,
      +lastUpdatedTime: number,
    }
  | {
      +resolved: false,
      +threadID: string,
      +lastUpdatedAtLeastTime: number,
      +lastUpdatedAtMostTime: number,
    };

function sortFuncForAtLeastTime(pointer: ChatThreadPointer): number {
  return pointer.resolved
    ? pointer.lastUpdatedTime
    : pointer.lastUpdatedAtLeastTime;
}

function sortFuncForAtMostTime(pointer: ChatThreadPointer): number {
  return pointer.resolved
    ? pointer.lastUpdatedTime
    : pointer.lastUpdatedAtMostTime;
}

function insertIntoSortedDescendingArray(
  pointer: ChatThreadPointer,
  sortedArray: Array<ChatThreadPointer>,
  sortFunc: ChatThreadPointer => number,
) {
  let i = 0;
  for (; i < sortedArray.length; i++) {
    const itemAtIndex = sortedArray[i];
    if (sortFunc(pointer) > sortFunc(itemAtIndex)) {
      break;
    }
  }
  sortedArray.splice(i, 0, pointer);
}

type BaseChatThreadItem = {
  +lastUpdatedTimeIncludingSidebars: number,
  ...
};
type BaseChatThreadItemLoader<T: BaseChatThreadItem> = {
  +threadInfo: {
    +id: string,
    ...
  },
  +lastUpdatedAtLeastTimeIncludingSidebars: number,
  +lastUpdatedAtMostTimeIncludingSidebars: number,
  +initialChatThreadItem: T,
  +getFinalChatThreadItem: () => Promise<T>,
};

class ChatThreadItemLoaderCache<
  Item: BaseChatThreadItem,
  Loader: BaseChatThreadItemLoader<Item> = BaseChatThreadItemLoader<Item>,
> {
  chatThreadItemLoaders: $ReadOnlyMap<string, Loader>;
  resolvedChatThreadItems: Map<string, Item | Promise<Item>> = new Map();
  currentState: {
    topNProcessed: number,
    pointerListOrderedByAtLeastTime: $ReadOnlyArray<ChatThreadPointer>,
    pointerListOrderedByAtMostTime: $ReadOnlyArray<ChatThreadPointer>,
  };
  loadingState: ?{
    topNProcessed: number,
    pointerListOrderedByAtLeastTime: Promise<$ReadOnlyArray<ChatThreadPointer>>,
    pointerListOrderedByAtMostTime: Promise<$ReadOnlyArray<ChatThreadPointer>>,
  };

  constructor(loaders: $ReadOnlyArray<Loader>) {
    const chatThreadItemLoaders = new Map<string, Loader>();
    for (const loader of loaders) {
      chatThreadItemLoaders.set(loader.threadInfo.id, loader);
    }
    this.chatThreadItemLoaders = chatThreadItemLoaders;
    this.currentState = {
      topNProcessed: 0,
      ...this.updateCurrentState(),
    };
  }

  updateCurrentState(): {
    +pointerListOrderedByAtLeastTime: $ReadOnlyArray<ChatThreadPointer>,
    +pointerListOrderedByAtMostTime: $ReadOnlyArray<ChatThreadPointer>,
  } {
    const pointerListOrderedByAtLeastTime: Array<ChatThreadPointer> = [];
    const pointerListOrderedByAtMostTime: Array<ChatThreadPointer> = [];
    const loaders = this.chatThreadItemLoaders;
    for (const threadID of loaders.keys()) {
      let chatThreadPointer;
      const resolved = this.resolvedChatThreadItems.get(threadID);
      if (resolved && !(resolved instanceof Promise)) {
        chatThreadPointer = {
          resolved: true,
          threadID,
          lastUpdatedTime: resolved.lastUpdatedTimeIncludingSidebars,
        };
      } else {
        const loader = loaders.get(threadID);
        invariant(loader, 'loader should be set during keys() iteration');
        chatThreadPointer = {
          resolved: false,
          threadID,
          lastUpdatedAtLeastTime:
            loader.lastUpdatedAtLeastTimeIncludingSidebars,
          lastUpdatedAtMostTime: loader.lastUpdatedAtMostTimeIncludingSidebars,
        };
      }
      insertIntoSortedDescendingArray(
        chatThreadPointer,
        pointerListOrderedByAtLeastTime,
        sortFuncForAtLeastTime,
      );
      insertIntoSortedDescendingArray(
        chatThreadPointer,
        pointerListOrderedByAtMostTime,
        sortFuncForAtMostTime,
      );
    }
    return { pointerListOrderedByAtLeastTime, pointerListOrderedByAtMostTime };
  }

  getChatThreadItemForThreadID(threadID: string): Item {
    const resolved = this.resolvedChatThreadItems.get(threadID);
    if (resolved && !(resolved instanceof Promise)) {
      return resolved;
    }
    const loader = this.chatThreadItemLoaders.get(threadID);
    invariant(loader, `loader should exist for threadID ${threadID}`);
    return loader.initialChatThreadItem;
  }

  getAllChatThreadItems(): Array<Item> {
    return this.currentState.pointerListOrderedByAtLeastTime.map(pointer =>
      this.getChatThreadItemForThreadID(pointer.threadID),
    );
  }

  loadMostRecent(n: number): Promise<$ReadOnlyArray<ChatThreadPointer>> {
    if (this.currentState.topNProcessed >= n) {
      return Promise.resolve(this.currentState.pointerListOrderedByAtMostTime);
    } else if (this.loadingState && this.loadingState.topNProcessed >= n) {
      return this.loadingState.pointerListOrderedByAtMostTime;
    }

    const getPromise = async () => {
      let pointerList = this.currentState.pointerListOrderedByAtMostTime;

      while (true) {
        // First, resolve the first n items
        const pointerPromises: Array<mixed | Promise<mixed>> = pointerList.map(
          (pointer, i): mixed | Promise<mixed> => {
            if (i >= n || pointer.resolved) {
              return undefined;
            }
            const { threadID } = pointer;

            const resolved = this.resolvedChatThreadItems.get(threadID);
            if (resolved && resolved instanceof Promise) {
              return resolved;
            } else if (resolved) {
              return undefined;
            }

            const loader = this.chatThreadItemLoaders.get(threadID);
            invariant(loader, `loader should exist for threadID ${threadID}`);
            const promise = (async () => {
              const finalChatThreadItemPromise =
                loader.getFinalChatThreadItem();
              this.resolvedChatThreadItems.set(
                threadID,
                finalChatThreadItemPromise,
              );
              const finalChatThreadItem = await finalChatThreadItemPromise;
              this.resolvedChatThreadItems.set(threadID, finalChatThreadItem);
            })();
            return promise;
          },
        );
        await Promise.all(pointerPromises);

        // Next, reorder them
        const {
          pointerListOrderedByAtLeastTime,
          pointerListOrderedByAtMostTime,
        } = this.updateCurrentState();

        // Decide if we need to continue
        let firstNItemsResolved = true;
        const numItems = Math.min(n, pointerListOrderedByAtMostTime.length);
        for (let i = 0; i < numItems; i++) {
          const pointer = pointerListOrderedByAtMostTime[i];
          if (!pointer.resolved) {
            firstNItemsResolved = false;
            break;
          }
        }
        if (firstNItemsResolved) {
          if (n === this.loadingState?.topNProcessed) {
            this.currentState = {
              topNProcessed: n,
              pointerListOrderedByAtLeastTime,
              pointerListOrderedByAtMostTime,
            };
            this.loadingState = null;
          }
          break;
        }

        pointerList = pointerListOrderedByAtMostTime;
      }
    };

    let waitForOngoingThenFetchPromise;
    if (!this.loadingState) {
      waitForOngoingThenFetchPromise = getPromise();
    } else {
      const oldPromise = this.loadingState.pointerListOrderedByAtMostTime;
      waitForOngoingThenFetchPromise = (async () => {
        await oldPromise;
        await getPromise();
      })();
    }

    this.loadingState = {
      topNProcessed: n,
      pointerListOrderedByAtLeastTime: (async () => {
        await waitForOngoingThenFetchPromise;
        return this.currentState.pointerListOrderedByAtLeastTime;
      })(),
      pointerListOrderedByAtMostTime: (async () => {
        await waitForOngoingThenFetchPromise;
        return this.currentState.pointerListOrderedByAtMostTime;
      })(),
    };
    return this.loadingState.pointerListOrderedByAtMostTime;
  }

  async loadMostRecentChatThreadItems(
    n: number,
  ): Promise<$ReadOnlyArray<Item>> {
    await this.loadMostRecent(n);
    return this.currentState.pointerListOrderedByAtMostTime.map(pointer =>
      this.getChatThreadItemForThreadID(pointer.threadID),
    );
  }
}

export default ChatThreadItemLoaderCache;
