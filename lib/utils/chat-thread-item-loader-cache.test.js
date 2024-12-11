// @flow

import ChatThreadItemLoaderCache from './chat-thread-item-loader-cache.js';

type MinChatThreadItem = {
  +id: string,
  +lastUpdatedTimeIncludingSidebars: number,
};

let cache = new ChatThreadItemLoaderCache<MinChatThreadItem>([]);
const resetCache = () => {
  cache = new ChatThreadItemLoaderCache<MinChatThreadItem>([
    {
      threadInfo: {
        id: '0',
      },
      lastUpdatedAtLeastTimeIncludingSidebars: 500,
      lastUpdatedAtMostTimeIncludingSidebars: 500,
      initialChatThreadItem: {
        id: '0',
        lastUpdatedTimeIncludingSidebars: 500,
      },
      getFinalChatThreadItem: async () => ({
        id: '0',
        lastUpdatedTimeIncludingSidebars: 500,
      }),
    },
    {
      threadInfo: {
        id: '1',
      },
      lastUpdatedAtLeastTimeIncludingSidebars: 475,
      lastUpdatedAtMostTimeIncludingSidebars: 525,
      initialChatThreadItem: {
        id: '1',
        lastUpdatedTimeIncludingSidebars: 475,
      },
      getFinalChatThreadItem: async () => ({
        id: '1',
        lastUpdatedTimeIncludingSidebars: 525,
      }),
    },
    {
      threadInfo: {
        id: '3',
      },
      lastUpdatedAtLeastTimeIncludingSidebars: 450,
      lastUpdatedAtMostTimeIncludingSidebars: 450,
      initialChatThreadItem: {
        id: '3',
        lastUpdatedTimeIncludingSidebars: 450,
      },
      getFinalChatThreadItem: async () => ({
        id: '3',
        lastUpdatedTimeIncludingSidebars: 450,
      }),
    },
    {
      threadInfo: {
        id: '4',
      },
      lastUpdatedAtLeastTimeIncludingSidebars: 425,
      lastUpdatedAtMostTimeIncludingSidebars: 480,
      initialChatThreadItem: {
        id: '4',
        lastUpdatedTimeIncludingSidebars: 425,
      },
      getFinalChatThreadItem: async () => ({
        id: '4',
        lastUpdatedTimeIncludingSidebars: 480,
      }),
    },
  ]);
};

describe('getAllChatThreadItems', () => {
  beforeAll(() => {
    resetCache();
  });
  it('returns initial ordering', () => {
    const items = cache.getAllChatThreadItems();
    expect(items[0].id === '0');
    expect(items[1].id === '1');
    expect(items[2].id === '2');
    expect(items[3].id === '3');
  });
});

describe('loadMostRecentChatThreadItems', () => {
  beforeAll(() => {
    resetCache();
  });
  it('reorders items 0 and 1', async () => {
    const items = await cache.loadMostRecentChatThreadItems(2);
    expect(items[0].id === '1');
    expect(items[1].id === '0');
    expect(items[2].id === '2');
    expect(items[3].id === '3');
  });
  it('reorders all items', async () => {
    const items = await cache.loadMostRecentChatThreadItems(4);
    expect(items[0].id === '1');
    expect(items[1].id === '0');
    expect(items[2].id === '3');
    expect(items[3].id === '2');
  });
  it('calls loadMostRecentChatThreadItems twice in a row', async () => {
    void (async () => {
      const firstItems = await cache.loadMostRecentChatThreadItems(2);
      expect(firstItems[0].id === '1');
      expect(firstItems[1].id === '0');
      expect(firstItems[2].id === '3');
      expect(firstItems[3].id === '2');
    })();
    const items = await cache.loadMostRecentChatThreadItems(4);
    expect(items[0].id === '1');
    expect(items[1].id === '0');
    expect(items[2].id === '3');
    expect(items[3].id === '2');
  });
});
