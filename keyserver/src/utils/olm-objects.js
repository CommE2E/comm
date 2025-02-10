// @flow

import olm, {
  type Account as OlmAccount,
  type Session as OlmSession,
} from '@commapp/olm';
import uuid from 'uuid';

import { ServerError } from 'lib/utils/errors.js';

import { getMessageForException } from '../responders/utils.js';

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

  let result;
  try {
    result = await callback(account, picklingKey);
  } catch (e) {
    throw new ServerError(getMessageForException(e) ?? 'unknown_error');
  }
  const updatedAccount = account.pickle(picklingKey);

  account.free();

  return {
    result,
    pickledOlmAccount: { ...pickledOlmAccount, pickledAccount: updatedAccount },
  };
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
  callback: (session: OlmSession, picklingKey: string) => Promise<T> | T,
): Promise<{ +result: T, +pickledOlmSession: PickledOlmSession }> {
  const { picklingKey, pickledSession } = pickledOlmSession;

  await olm.init();

  const session = new olm.Session();
  session.unpickle(picklingKey, pickledSession);

  let result;
  try {
    result = await callback(session, picklingKey);
  } catch (e) {
    throw new ServerError(getMessageForException(e) ?? 'unknown_error');
  }
  const updatedSession = session.pickle(picklingKey);

  session.free();

  return {
    result,
    pickledOlmSession: {
      ...pickledOlmSession,
      pickledSession: updatedSession,
    },
  };
}

export {
  unpickleAccountAndUseCallback,
  createPickledOlmAccount,
  unpickleSessionAndUseCallback,
};
