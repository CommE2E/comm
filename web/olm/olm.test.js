// @flow

import olm from '@commapp/olm';

describe('olm.Account', () => {
  it('should construct an empty olm.Account', async () => {
    await olm.init();
    const account = new olm.Account();
    expect(account).toBeDefined();
  });
  it('should be able to generate and return prekey', async () => {
    await olm.init();
    const account = new olm.Account();
    account.create();
    account.generate_prekey();
    expect(account.prekey()).toBeDefined();
  });
  it('should be able to generate and return one-time keys', async () => {
    await olm.init();
    const account = new olm.Account();
    account.create();
    account.generate_one_time_keys(5);
    const oneTimeKeysObject = JSON.parse(account.one_time_keys());
    expect(oneTimeKeysObject).toBeDefined();
    const oneTimeKeys = oneTimeKeysObject.curve25519;
    expect(Object.keys(oneTimeKeys).length).toBe(5);
  });
});
