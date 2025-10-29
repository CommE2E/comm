// @flow

import olm, {
  type Account as OlmAccount,
  type Session as OlmSession,
} from '@commapp/olm';
import uuid from 'uuid';

import { olmEncryptedMessageTypes } from 'lib/types/crypto-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { getMessageForException } from '../responders/utils.js';

// Import vodozemac dynamically since it uses CommonJS exports
let vodozemacModule = null;
async function getVodozemacModule() {
  if (!vodozemacModule) {
    vodozemacModule = await import(
      '../../../vodozemac-wasm/wasm/node/vodozemac.js'
    );
  }
  return vodozemacModule;
}

// Helper function to get 32-byte pickle key for vodozemac
function getVodozemacPickleKey(picklingKey: string): Uint8Array {
  const fullKeyBytes = new TextEncoder().encode(picklingKey);
  // NOTE: vodozemac works only with 32-byte keys.
  // We have sessions pickled with 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  return fullKeyBytes.slice(0, 32);
}

export type PickledOlmAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

async function unpickleAccountAndUseCallback<T>(
  pickledOlmAccount: PickledOlmAccount,
  callback: (account: OlmAccount, picklingKey: string) => Promise<T> | T,
): Promise<{ +result: T, +pickledOlmAccount: PickledOlmAccount }> {
  const { picklingKey, pickledAccount } = pickledOlmAccount;

  await olm.init();

  const account = new olm.Account();
  account.unpickle(picklingKey, pickledAccount);

  try {
    const result = await callback(account, picklingKey);
    const updatedAccount = account.pickle(picklingKey);
    return {
      result,
      pickledOlmAccount: {
        ...pickledOlmAccount,
        pickledAccount: updatedAccount,
      },
    };
  } catch (e) {
    throw new ServerError(getMessageForException(e) ?? 'unknown_error');
  } finally {
    account.free();
  }
}

async function createPickledOlmAccount(): Promise<PickledOlmAccount> {
  await olm.init();

  const account = new olm.Account();
  account.create();

  const picklingKey = uuid.v4();
  const pickledAccount = account.pickle(picklingKey);

  account.free();

  return {
    picklingKey,
    pickledAccount,
  };
}

export type PickledOlmSession = {
  +picklingKey: string,
  +pickledSession: string,
};
async function unpickleSessionAndUseCallback<T>(
  pickledOlmSession: PickledOlmSession,
  callback: (session: any) => Promise<T> | T, // Using 'any' since vodozemac session has different interface
): Promise<{ +result: T, +pickledOlmSession: PickledOlmSession }> {
  const { picklingKey, pickledSession } = pickledOlmSession;

  const { Session: VodozemacSession } = await getVodozemacModule();

  const fullKeyBytes = new TextEncoder().encode(picklingKey);
  // NOTE: vodozemac works only with 32-byte keys.
  // We have sessions pickled with 64-byte keys. Additionally, this key
  // is used in backup, so it can't simply be migrated. Instead, we're going
  // to just use the first 32 bytes of the existing secret key.
  const pickleKeyBytes = fullKeyBytes.slice(0, 32);

  let session;
  try {
    // First try vodozemac native format
    session = VodozemacSession.from_pickle(pickledSession, pickleKeyBytes);
  } catch (e) {
    // Fall back to libolm format
    session = VodozemacSession.from_libolm_pickle(pickledSession, fullKeyBytes);
  }

  try {
    const result = await callback(session);
    const updatedSession = session.pickle(pickleKeyBytes);
    return {
      result,
      pickledOlmSession: {
        ...pickledOlmSession,
        pickledSession: updatedSession,
      },
    };
  } catch (e) {
    throw new ServerError(getMessageForException(e) ?? 'unknown_error');
  } finally {
    session.free();
  }
}

async function createPickledOlmSession(
  account: OlmAccount,
  accountPicklingKey: string,
  initialEncryptedMessage: string,
  theirCurve25519Key?: string,
): Promise<string> {
  await olm.init();
  const session = new olm.Session();

  if (theirCurve25519Key) {
    session.create_inbound_from(
      account,
      theirCurve25519Key,
      initialEncryptedMessage,
    );
  } else {
    session.create_inbound(account, initialEncryptedMessage);
  }

  account.remove_one_time_keys(session);
  session.decrypt(olmEncryptedMessageTypes.PREKEY, initialEncryptedMessage);
  const pickledSession = session.pickle(accountPicklingKey);

  session.free();

  return pickledSession;
}

export {
  unpickleAccountAndUseCallback,
  createPickledOlmAccount,
  unpickleSessionAndUseCallback,
  createPickledOlmSession,
};
