// @flow

import olm from '@commapp/olm';
import type { Account, Session } from '@commapp/olm';

import {
  type OlmAPI,
  olmEncryptedMessageTypes,
  type OLMIdentityKeys,
  type OneTimeKeysResultValues,
} from 'lib/types/crypto-types.js';
import { getAccountOneTimeKeys } from 'lib/utils/olm-utils.js';

// methods below are just mocks to SQLite API
// implement proper methods tracked in ENG-6462

function getOlmAccount(): Account {
  const account = new olm.Account();
  account.create();
  return account;
}
// eslint-disable-next-line no-unused-vars
function getOlmSession(deviceID: string): Session {
  return new olm.Session();
}
// eslint-disable-next-line no-unused-vars
function storeOlmAccount(account: Account): void {}
// eslint-disable-next-line no-unused-vars
function storeOlmSession(session: Session): void {}

const olmAPI: OlmAPI = {
  async initializeCryptoAccount(): Promise<void> {
    await olm.init();
  },
  async encrypt(content: string, deviceID: string): Promise<string> {
    const session = getOlmSession(deviceID);
    const { body } = session.encrypt(content);
    storeOlmSession(session);
    return body;
  },
  async decrypt(encryptedContent: string, deviceID: string): Promise<string> {
    const session = getOlmSession(deviceID);
    const result = session.decrypt(
      olmEncryptedMessageTypes.TEXT,
      encryptedContent,
    );
    storeOlmSession(session);
    return result;
  },
  async contentInboundSessionCreator(
    contentIdentityKeys: OLMIdentityKeys,
    initialEncryptedContent: string,
  ): Promise<string> {
    const account = getOlmAccount();
    const session = new olm.Session();
    session.create_inbound_from(
      account,
      contentIdentityKeys.curve25519,
      initialEncryptedContent,
    );

    account.remove_one_time_keys(session);
    const initialEncryptedMessage = session.decrypt(
      olmEncryptedMessageTypes.PREKEY,
      initialEncryptedContent,
    );
    storeOlmAccount(account);
    storeOlmSession(session);
    return initialEncryptedMessage;
  },
  async getOneTimeKeys(numberOfKeys: number): Promise<OneTimeKeysResultValues> {
    const contentAccount = getOlmAccount();
    const notifAccount = getOlmAccount();
    const contentOneTimeKeys = getAccountOneTimeKeys(
      contentAccount,
      numberOfKeys,
    );
    contentAccount.mark_keys_as_published();
    storeOlmAccount(contentAccount);

    const notificationsOneTimeKeys = getAccountOneTimeKeys(
      notifAccount,
      numberOfKeys,
    );
    notifAccount.mark_keys_as_published();
    storeOlmAccount(notifAccount);

    return { contentOneTimeKeys, notificationsOneTimeKeys };
  },
};

export { olmAPI };
