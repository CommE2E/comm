// @flow

import olm from '@matrix-org/olm';

import { getOlmUtility } from '../utils/olm-utils.js';

describe('olm.Account', () => {
  it('should get Olm Utility', async () => {
    await olm.init();
    const utility = getOlmUtility();
    expect(utility).not.toBe(undefined);
  });
});
