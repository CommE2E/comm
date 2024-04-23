// @flow

import { type Config } from '../config.js';

const getConfig = (): Config => ({
  resolveKeyserverSessionInvalidationUsingNativeCredentials: null,
  setSessionIDOnRequest: true,
  calendarRangeInactivityLimit: null,
  platformDetails: {
    platform: 'web',
    codeVersion: 70,
    stateVersion: 50,
  },
  authoritativeKeyserverID: '123',
  olmAPI: {
    initializeCryptoAccount: jest.fn(),
    getUserPublicKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    decryptSequentialAndPersist: jest.fn(),
    contentInboundSessionCreator: jest.fn(),
    contentOutboundSessionCreator: jest.fn(),
    notificationsSessionCreator: jest.fn(),
    getOneTimeKeys: jest.fn(),
    validateAndUploadPrekeys: jest.fn(),
    signMessage: jest.fn(),
  },
  sqliteAPI: {
    getAllReceivedMessageToDevice: jest.fn(),
    removeReceivedMessagesToDevice: jest.fn(),
  },
});

const hasConfig = (): boolean => true;

export { getConfig, hasConfig };
