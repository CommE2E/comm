// @flow

const { Account } = require('../pkg/vodozemac.js');

const PICKLE_KEY = 'DEFAULT_PICKLE_KEY_1234567890___';

describe('Olm Account', function () {
  it('should be created successfully', function () {
    const account = new Account();
    expect(account.ed25519_key).not.toBe('');
    expect(account.curve25519_key).not.toBe('');
  });

  it('should generate one-time keys', function () {
    const account = new Account();

    expect(account.one_time_keys.size).toBe(0);
    account.generate_one_time_keys(10);
    expect(account.one_time_keys.size).toBe(10);

    account.mark_keys_as_published();
    expect(account.one_time_keys.size).toBe(0);
  });

  it('should generate fallback keys', function () {
    const account = new Account();

    expect(account.fallback_key.size).toBe(0);
    account.generate_fallback_key();
    expect(account.fallback_key.size).toBe(1);

    account.mark_keys_as_published();
    expect(account.fallback_key.size).toBe(0);
  });

  it('should tell us how many one-time keys we should upload', function () {
    const account = new Account();
    expect(account.max_number_of_one_time_keys).toBeGreaterThan(10);
    expect(account.max_number_of_one_time_keys).toBeLessThan(1000);
  });

  it('should let us pickle and unpickle the account', function () {
    const account = new Account();
    const pickled = account.pickle(PICKLE_KEY);
    const unpickled = Account.from_pickle(pickled, PICKLE_KEY);

    expect(account.ed25519_key).toEqual(unpickled.ed25519_key);
  });

  it('should let us unpickle an libolm account', function () {
    const libolm_pickle =
      '3wpPcPT4xsRYCYF34NcnozxE5bN2E6qwBXQYuoovt/TX//' +
      '8Dnd8gaKsxN9En/7Hkh5XemuGUo3dXHVTl76G2pjf9ehfr' +
      'yhITMbeBrE/XuxmNvS2aB9KU4mOKXlAWhCEsE7JW9fUkRh' +
      'HWWkFwTvSC3eDthd6eNx3VKZlmGR270vIpIG5/Ho4YK9/0' +
      '3lPGpil0cuEuGTTjKHXGRu9kpnQe99QGCB4KBuP5IJjFeW' +
      'btSgJ4ZrajZdlTew';

    const pickle_key = Buffer.from("It's a secret to everybody");
    const account = Account.from_libolm_pickle(libolm_pickle, pickle_key);

    expect(account.ed25519_key).toEqual(
      'MEQCwaTE/gcrHaxwv06WEVy5xDA30FboFzCAtYhzmoc',
    );
  });

  it('should throw an exception if the pickle is not valid', function () {
    expect(() => Account.from_pickle('', PICKLE_KEY)).toThrow();
  });
});
