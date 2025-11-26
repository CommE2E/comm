// @flow

import uuid from 'uuid';
import {
  type Account as OlmAccount,
  Account,
  OlmMessage,
  type Session as OlmSession,
} from 'vodozemac';

import { olmEncryptedMessageTypes } from 'lib/types/crypto-types.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  getVodozemacPickleKey,
  unpickleVodozemacAccount,
  unpickleVodozemacSession,
} from 'lib/utils/vodozemac-utils.js';

import { getMessageForException } from '../responders/utils.js';

export type PickledOlmAccount = {
  +picklingKey: string,
  +pickledAccount: string,
};

async function unpickleAccountAndUseCallback<T>(
  pickledOlmAccount: PickledOlmAccount,
  callback: (account: OlmAccount, picklingKey: string) => Promise<T> | T,
): Promise<{ +result: T, +pickledOlmAccount: PickledOlmAccount }> {
  const { picklingKey } = pickledOlmAccount;

  const account = unpickleVodozemacAccount(pickledOlmAccount);

  console.log('WORKS');

  try {
    const result = await callback(account, picklingKey);
    const updatedAccount = account.pickle(getVodozemacPickleKey(picklingKey));
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
  const account = new Account();

  const picklingKey = uuid.v4();
  const pickledAccount = account.pickle(getVodozemacPickleKey(picklingKey));
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
  callback: (session: OlmSession) => Promise<T> | T,
): Promise<{ +result: T, +pickledOlmSession: PickledOlmSession }> {
  const { picklingKey } = pickledOlmSession;
  const session = unpickleVodozemacSession(pickledOlmSession);

  try {
    const result = await callback(session);
    const updatedSession = session.pickle(getVodozemacPickleKey(picklingKey));
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
  //NOTE: this is now required
  theirCurve25519Key: string,
): Promise<string> {
  console.log('here');
  const olmMessage = new OlmMessage(0, initialEncryptedMessage);
  console.log('here2', theirCurve25519Key);
  if (!theirCurve25519Key) {
    throw Error('signing key missing');
  }
  console.log('here3');

  const inboundCreationResult = account.create_inbound_session(
    theirCurve25519Key,
    olmMessage,
  );

  console.log('here4');

  // This is consuming, cant free
  const session = inboundCreationResult.into_session();
  console.log('here5');
  const pickledSession = session.pickle(
    getVodozemacPickleKey(accountPicklingKey),
  );
  console.log('here6');
  session.free();

  console.log('here8');

  return pickledSession;
}

export {
  unpickleAccountAndUseCallback,
  createPickledOlmAccount,
  unpickleSessionAndUseCallback,
  createPickledOlmSession,
};
