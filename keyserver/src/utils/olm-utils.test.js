// @flow

import olm from '@commapp/olm';

import { getOlmUtility } from '../utils/olm-utils.js';

describe('olm.Account', () => {
  it('should get Olm Utility', async () => {
    await olm.init();
    const utility = getOlmUtility();
    expect(utility).not.toBe(undefined);
  });
  it('should be able to generate and return prekey', async () => {
    await olm.init();
    const account = new olm.Account();
    account.create();
    account.generate_prekey();
    expect(account.prekey()).not.toBe(undefined);
  });
});
