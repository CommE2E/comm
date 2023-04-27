// @flow

import olm from '@commapp/olm';

import { getOlmUtility } from '../utils/olm-utils.js';

describe('olm.Account', () => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';

  const randomString = length =>
    Array.from(
      { length },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join('');

  const initAccount = (mark_prekey_published = true) => {
    const account = new olm.Account();
    account.create();
    account.generate_prekey();
    account.generate_one_time_keys(1);
    if (mark_prekey_published) {
      account.mark_prekey_as_published();
    }
    return account;
  };

  const createSession = (
    aliceSession,
    aliceAccount,
    bobAccount,
    regen = false,
    forget = false,
    invalid_sign = false,
  ) => {
    const bobOneTimeKeys = JSON.parse(bobAccount.one_time_keys()).curve25519;
    bobAccount.mark_keys_as_published();
    const otk_id = Object.keys(bobOneTimeKeys)[0];

    if (regen) {
      bobAccount.generate_prekey();
      if (forget) {
        bobAccount.forget_old_prekey();
      }
    }

    if (invalid_sign) {
      try {
        aliceSession.create_outbound(
          aliceAccount,
          JSON.parse(bobAccount.identity_keys()).curve25519,
          JSON.parse(bobAccount.identity_keys()).ed25519,
          String(Object.values(JSON.parse(bobAccount.prekey()).curve25519)[0]),
          bobAccount.sign(randomString(32)),
          bobOneTimeKeys[otk_id],
        );
      } catch (error) {
        expect(error.message).toBe('OLM.BAD_SIGNATURE');
        return false;
      }

      try {
        aliceSession.create_outbound(
          aliceAccount,
          JSON.parse(bobAccount.identity_keys()).curve25519,
          JSON.parse(bobAccount.identity_keys()).ed25519,
          String(Object.values(JSON.parse(bobAccount.prekey()).curve25519)[0]),
          randomString(43),
          bobOneTimeKeys[otk_id],
        );
      } catch (error) {
        expect(error.message).toBe('OLM.INVALID_BASE64');
        return false;
      }
    }

    aliceSession.create_outbound(
      aliceAccount,
      JSON.parse(bobAccount.identity_keys()).curve25519,
      JSON.parse(bobAccount.identity_keys()).ed25519,
      String(Object.values(JSON.parse(bobAccount.prekey()).curve25519)[0]),
      bobAccount.prekey_signature(),
      bobOneTimeKeys[otk_id],
    );

    return aliceSession;
  };

  const testRatchet = (aliceSession, bobSession, bobAccount, num_msg = 1) => {
    let test_text = randomString(40);
    let encrypted = aliceSession.encrypt(test_text);
    expect(encrypted.type).toEqual(0);

    try {
      bobSession.create_inbound(bobAccount, encrypted.body);
    } catch (error) {
      expect(error.message).toBe('OLM.BAD_MESSAGE_KEY_ID');
      return false;
    }

    bobAccount.remove_one_time_keys(bobSession);
    let decrypted = bobSession.decrypt(encrypted.type, encrypted.body);
    expect(decrypted).toEqual(test_text);

    test_text = randomString(40);
    encrypted = bobSession.encrypt(test_text);
    expect(encrypted.type).toEqual(1);
    decrypted = aliceSession.decrypt(encrypted.type, encrypted.body);
    expect(decrypted).toEqual(test_text);

    for (let index = 1; index < num_msg; index++) {
      test_text = randomString(40);
      encrypted = aliceSession.encrypt(test_text);
      expect(encrypted.type).toEqual(1);
      decrypted = bobSession.decrypt(encrypted.type, encrypted.body);
      expect(decrypted).toEqual(test_text);

      test_text = randomString(40);
      encrypted = bobSession.encrypt(test_text);
      expect(encrypted.type).toEqual(1);
      decrypted = aliceSession.decrypt(encrypted.type, encrypted.body);
      expect(decrypted).toEqual(test_text);
    }

    return true;
  };

  it('should get Olm Utility', async () => {
    await olm.init();
    const utility = getOlmUtility();
    expect(utility).toBeDefined();
  });

  it('should generate, regenerate, forget, and publish prekey', async () => {
    await olm.init();
    const account = initAccount(false);

    expect(account.last_prekey_publish_time()).toEqual(0);
    expect(account.prekey()).toBeDefined();
    expect(account.unpublished_prekey()).toBeDefined();
    account.mark_prekey_as_published();
    const last_published = account.last_prekey_publish_time();
    expect(last_published).toBeGreaterThan(0);

    try {
      console.log(account.unpublished_prekey());
    } catch (error) {
      expect(error.message).toContain('NO_UNPUBLISHED_PREKEY');
    }
    account.forget_old_prekey();

    account.generate_prekey();
    expect(account.prekey()).toBeDefined();
    expect(account.unpublished_prekey()).toBeDefined();

    expect(account.last_prekey_publish_time()).toEqual(last_published);
    account.mark_prekey_as_published();
    expect(account.last_prekey_publish_time()).toBeGreaterThanOrEqual(
      last_published,
    );
    account.forget_old_prekey();
  });

  it('should encrypt and decrypt', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();
    const bobSession = new olm.Session();

    createSession(aliceSession, aliceAccount, bobAccount);
    expect(testRatchet(aliceSession, bobSession, bobAccount)).toBeTrue;
  });

  it('should encrypt and decrypt, even after a prekey is rotated', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();
    const bobSession = new olm.Session();

    createSession(aliceSession, aliceAccount, bobAccount, true);
    expect(testRatchet(aliceSession, bobSession, bobAccount)).toBeTrue;
  });

  it('should not encrypt and decrypt, after the old prekey is forgotten', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();
    const bobSession = new olm.Session();

    createSession(aliceSession, aliceAccount, bobAccount, true, true);
    expect(testRatchet(aliceSession, bobSession, bobAccount)).toBeFalse;
  });

  it('should encrypt and decrypt repeatedly', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();
    const bobSession = new olm.Session();

    createSession(aliceSession, aliceAccount, bobAccount, false, false);
    expect(testRatchet(aliceSession, bobSession, bobAccount, 100)).toBeTrue;
  });

  it('should not encrypt and decrypt if prekey is not signed correctly', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();

    expect(
      createSession(aliceSession, aliceAccount, bobAccount, false, false, true),
    ).toBeFalse;
  });
});
