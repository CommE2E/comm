// @flow

import olm, { type Account as OlmAccount } from '@commapp/olm';

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

export { unpickleAccountAndUseCallback };
