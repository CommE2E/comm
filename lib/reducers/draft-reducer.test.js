// @flow

import { removeKeyserversDraftsFromStore } from './draft-reducer.js';

describe('removeKeyserversDraftsFromStore', () => {
  const keyserver1 = '256';
  const keyserver2 = '100';
  const keyserver3 = '200';

  const drafts1 = {
    [keyserver1 + '|1']: 'test',
    [keyserver1 + '|2']: 'test',
    [keyserver1 + '|3']: 'test',
  };
  const drafts2 = {
    [keyserver2 + '|1']: 'test',
    [keyserver2 + '|2']: 'test',
    [keyserver2 + '|3']: 'test',
  };
  const drafts3 = {
    [keyserver3 + '|1']: 'test',
    [keyserver3 + '|2']: 'test',
    [keyserver3 + '|3']: 'test',
  };

  it('removes drafts of given keyservers', () => {
    const result = removeKeyserversDraftsFromStore(
      { drafts: { ...drafts1, ...drafts2, ...drafts3 } },
      [keyserver1, keyserver2],
    );
    expect(result.draftStoreOperations).toEqual([
      {
        type: 'remove',
        payload: { ids: [...Object.keys(drafts1), ...Object.keys(drafts2)] },
      },
    ]);

    expect(result.draftStore.drafts).toEqual(drafts3);
  });
});
