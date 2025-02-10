// @flow

import olm from '@commapp/olm';

import { getOlmUtility } from 'lib/utils/olm-utility.js';

describe('olm.Account', () => {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';

  const randomString = (length: number) =>
    Array.from(
      { length },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join('');

  const initAccount = (mark_prekey_published: boolean = true) => {
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
    aliceSession: olm.Session,
    aliceAccount: olm.Account,
    bobAccount: olm.Account,
    regen: boolean = false,
    forget: boolean = false,
    invalid_sign: boolean = false,
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
      String(bobAccount.prekey_signature()),
      bobOneTimeKeys[otk_id],
    );

    return aliceSession;
  };

  const createSessionWithoutOTK = (
    aliceSession: olm.Session,
    aliceAccount: olm.Account,
    bobAccount: olm.Account,
  ) => {
    aliceSession.create_outbound_without_otk(
      aliceAccount,
      JSON.parse(bobAccount.identity_keys()).curve25519,
      JSON.parse(bobAccount.identity_keys()).ed25519,
      String(Object.values(JSON.parse(bobAccount.prekey()).curve25519)[0]),
      String(bobAccount.prekey_signature()),
    );

    return aliceSession;
  };

  const testRatchet = (
    aliceSession: olm.Session,
    bobSession: olm.Session,
    bobAccount: olm.Account,
    num_msg: number = 1,
  ) => {
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

    const aliceEncrypted = aliceSession.encrypt(test_text);
    expect(() =>
      aliceSession.decrypt(aliceEncrypted.type, aliceEncrypted.body),
    ).toThrow('OLM.BAD_MESSAGE_MAC');

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

    expect(() =>
      aliceSession.decrypt_sequential(encrypted.type, encrypted.body),
    ).toThrow('OLM.OLM_ALREADY_DECRYPTED_OR_KEYS_SKIPPED');

    return true;
  };

  const testRatchetSequential = (
    aliceSession: olm.Session,
    bobSession: olm.Session,
    bobAccount: olm.Account,
  ) => {
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

    const testText1 = 'message1';
    const encrypted1 = bobSession.encrypt(testText1);
    const testText2 = 'message2';
    const encrypted2 = bobSession.encrypt(testText2);

    // encrypt message using alice session and trying to decrypt with
    // the same session => `BAD_MESSAGE_MAC`
    const aliceEncrypted = aliceSession.encrypt(test_text);
    expect(() =>
      aliceSession.decrypt_sequential(aliceEncrypted.type, aliceEncrypted.body),
    ).toThrow('OLM.BAD_MESSAGE_MAC');

    // decrypting encrypted2 before encrypted1 using
    // decrypt_sequential() => OLM_MESSAGE_OUT_OF_ORDER
    expect(() =>
      aliceSession.decrypt_sequential(encrypted2.type, encrypted2.body),
    ).toThrow('OLM.OLM_MESSAGE_OUT_OF_ORDER');

    // test correct order
    const decrypted1 = aliceSession.decrypt_sequential(
      encrypted1.type,
      encrypted1.body,
    );
    expect(decrypted1).toEqual(testText1);
    const decrypted2 = aliceSession.decrypt_sequential(
      encrypted2.type,
      encrypted2.body,
    );
    expect(decrypted2).toEqual(testText2);

    // try to decrypt second time
    // the same message => OLM_ALREADY_DECRYPTED_OR_KEYS_SKIPPED
    expect(() =>
      aliceSession.decrypt_sequential(encrypted2.type, encrypted2.body),
    ).toThrow('OLM.OLM_ALREADY_DECRYPTED_OR_KEYS_SKIPPED');

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

  it('should encrypt and decrypt sequential', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();
    const bobSession = new olm.Session();

    createSession(aliceSession, aliceAccount, bobAccount);
    expect(testRatchetSequential(aliceSession, bobSession, bobAccount))
      .toBeTrue;
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

  it('should create session without one-time key', async () => {
    await olm.init();
    const aliceAccount = initAccount();
    const bobAccount = initAccount();
    const aliceSession = new olm.Session();
    const bobSession = new olm.Session();

    expect(createSessionWithoutOTK(aliceSession, aliceAccount, bobAccount))
      .toBeTrue;
    expect(testRatchet(aliceSession, bobSession, bobAccount, 100)).toBeTrue;
  });
});
