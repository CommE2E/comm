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
    encryptAndPersist: jest.fn(),
    encryptNotification: jest.fn(),
    decrypt: jest.fn(),
    decryptAndPersist: jest.fn(),
    contentInboundSessionCreator: jest.fn(),
    contentOutboundSessionCreator: jest.fn(),
    keyserverNotificationsSessionCreator: jest.fn(),
    notificationsOutboundSessionCreator: jest.fn(),
    isContentSessionInitialized: jest.fn(),
    isDeviceNotificationsSessionInitialized: jest.fn(),
    isNotificationsSessionInitializedWithDevices: jest.fn(),
    getOneTimeKeys: jest.fn(),
    validateAndUploadPrekeys: jest.fn(),
    signMessage: jest.fn(),
    verifyMessage: jest.fn(),
    markPrekeysAsPublished: jest.fn(),
  },
  sqliteAPI: {
    getAllInboundP2PMessages: jest.fn(),
    getInboundP2PMessagesByID: jest.fn(),
    removeInboundP2PMessages: jest.fn(),
    processDBStoreOperations: jest.fn(),
    getUnsentOutboundP2PMessages: jest.fn(),
    markOutboundP2PMessageAsSent: jest.fn(),
    removeOutboundP2PMessage: jest.fn(),
    resetOutboundP2PMessagesForDevice: jest.fn(),
    getRelatedMessages: jest.fn(),
    getOutboundP2PMessagesByID: jest.fn(),
    searchMessages: jest.fn(),
    fetchMessages: jest.fn(),
    fetchDMOperationsByType: jest.fn(),
    restoreUserData: jest.fn(),
  },
  encryptedNotifUtilsAPI: {
    generateAESKey: jest.fn(),
    encryptWithAESKey: jest.fn(),
    encryptSerializedNotifPayload: jest.fn(),
    uploadLargeNotifPayload: jest.fn(),
    getEncryptedNotifHash: jest.fn(),
    getBlobHash: jest.fn(),
    getNotifByteSize: jest.fn(),
    normalizeUint8ArrayForBlobUpload: jest.fn(),
  },
  showAlert: jest.fn(),
});

const hasConfig = (): boolean => true;

export { getConfig, hasConfig };
