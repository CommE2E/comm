// @flow

import olm from '@matrix-org/olm';

describe('olm.Account', () => {
  it('should construct an empty olm.Account', async () => {
    await olm.init();
    const account = new olm.Account();
    expect(account).not.toBe(undefined);
  });
});
