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
});
