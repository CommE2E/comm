// @flow

import initVodozemac, {
  type Account as OlmAccount,
  Account,
  OlmMessage,
  type Session as OlmSession,
} from '@commapp/vodozemac';
import uuid from 'uuid';

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
  await initVodozemac();

  const { picklingKey } = pickledOlmAccount;
  const account = unpickleVodozemacAccount(pickledOlmAccount);

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
  await initVodozemac();

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
  await initVodozemac();

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
  theirCurve25519Key: string,
): Promise<string> {
  await initVodozemac();

  const olmMessage = new OlmMessage(
    olmEncryptedMessageTypes.PREKEY,
    initialEncryptedMessage,
  );
  const inboundCreationResult = account.create_inbound_session(
    theirCurve25519Key,
    olmMessage,
  );
  // into_session() is consuming object.
  // There is no need to call free() on inboundCreationResult
  const session = inboundCreationResult.into_session();
  const pickledSession = session.pickle(
    getVodozemacPickleKey(accountPicklingKey),
  );
  session.free();

  return pickledSession;
}

export {
  unpickleAccountAndUseCallback,
  createPickledOlmAccount,
  unpickleSessionAndUseCallback,
  createPickledOlmSession,
};
