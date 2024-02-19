// @flow

import olm from '@commapp/olm';
import type { Account, Session } from '@commapp/olm';

import {
  type OlmAPI,
  olmEncryptedMessageTypes,
} from 'lib/types/crypto-types.js';

// methods below are just mocks to SQLite API
// implement proper methods tracked in ENG-6462
// eslint-disable-next-line no-unused-vars
function getOlmAccount(): Account {
  return new olm.Account();
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
};

export { olmAPI };
