// @flow

const { Account, Session, OlmMessage } = require('../pkg/vodozemac.js');

const PICKLE_KEY = 'DEFAULT_PICKLE_KEY_1234567890___';

function create_session() {
  const alice = new Account();
  const bob = new Account();

  bob.generate_one_time_keys(1);
  const [one_time_key] = bob.one_time_keys.values();

  const session = alice.create_outbound_session(
    bob.curve25519_key,
    one_time_key,
  );

  return [alice, bob, session];
}

describe('Olm Session', function () {
  it('should be created successfully', function () {
    const [_alice, _bob, session] = create_session();
    expect(session.session_id).not.toBe('');
  });

  it('should not share the session id of another session', function () {
    const [_alice, _bob, session] = create_session();
    const [_alice2, _bob2, session2] = create_session();

    expect(session.session_id).not.toEqual(session2.session_id);
  });

  it('should let us pickle and unpickle the session', function () {
    const [_alice, _bob, session] = create_session();
    const pickled = session.pickle(PICKLE_KEY);
    const unpickled = Session.from_pickle(pickled, PICKLE_KEY);

    expect(session.session_id).toEqual(unpickled.session_id);
  });

  it('should throw an exception if the pickle is not valid', function () {
    expect(() => Session.from_pickle('', PICKLE_KEY)).toThrow();
  });

  it('should let us encrypt and decrypt messages', function () {
    const plaintext = "It's a secret to everybody";
    const [alice, bob, session] = create_session();

    const message = session.encrypt(plaintext);
    expect(message.message_type).toBe(0);

    const { plaintext: decrypted, session: bob_session } =
      bob.create_inbound_session(alice.curve25519_key, message);

    const decryptedStr = new TextDecoder().decode(decrypted);

    expect(decryptedStr).toEqual(plaintext);
    expect(session.session_id).toEqual(bob_session.session_id);
  });

  it('should throw an exception if the message is not valid', function () {
    const [_alice, _bob, session] = create_session();
    const message = new OlmMessage(0, 'x');
    expect(() => session.decrypt(message)).toThrow();
  });

  it('should let us encrypt and decrypt multiple messages', function () {
    let plaintext = "It's a secret to everybody";
    const [alice, bob, session] = create_session();

    let message = session.encrypt(plaintext);
    expect(message.message_type).toBe(0);

    let { plaintext: decrypted, session: bob_session } =
      bob.create_inbound_session(alice.curve25519_key, message);

    let decryptedStr = new TextDecoder().decode(decrypted);

    expect(decryptedStr).toEqual(plaintext);
    expect(session.session_id).toEqual(bob_session.session_id);

    plaintext = 'Grumble grumble';
    message = bob_session.encrypt(plaintext);
    decrypted = session.decrypt(message);

    decryptedStr = new TextDecoder().decode(decrypted);

    expect(decryptedStr).toEqual(plaintext);
  });

  it('should tell us if a pre-key message matches a session', function () {
    let plaintext = "It's a secret to everybody";
    const [alice, bob, session] = create_session();
    let message = session.encrypt(plaintext);
    const { plaintext: _decrypted, session: bob_session } =
      bob.create_inbound_session(alice.curve25519_key, message);

    plaintext = 'Grumble grumble';
    message = session.encrypt(plaintext);

    expect(bob_session.session_matches(message)).toBe(true);
  });

  it('should throw an exception if the one-time key is invalid', function () {
    const [alice, bob, _session] = create_session();

    expect(() => alice.create_outbound_session('x', 'x')).toThrow();

    const message = new OlmMessage(0, 'x');
    expect(() =>
      bob.create_inbound_session(alice.curve25519_key, message),
    ).toThrow();
  });

  it("should tell us if a pre-key message doesn't match a session", function () {
    const plaintext = "It's a secret to everybody";
    const [alice, bob, session] = create_session();

    let message = session.encrypt(plaintext);
    expect(message.message_type).toBe(0);

    const { plaintext: _decrypted, session: bob_session } =
      bob.create_inbound_session(alice.curve25519_key, message);
    const [_alice2, _bob2, session2] = create_session();

    message = session2.encrypt(plaintext);
    expect(bob_session.session_matches(message)).toBe(false);

    message = new OlmMessage(0, 'x');
    expect(bob_session.session_matches(message)).toBe(false);
  });
});
