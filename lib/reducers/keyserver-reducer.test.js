// @flow

import reduceKeyserverStore from './keyserver-reducer.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import { authoritativeKeyserverID } from '../utils/authoritative-keyserver.js';

jest.mock('../utils/config.js');

describe('reduceKeyserverStore', () => {
  it('removes from the store keyservers the user has disconnected from', () => {
    const oldKeyserverStore = {
      keyserverInfos: {
        ['0']: defaultKeyserverInfo('url1'),
        ['100']: defaultKeyserverInfo('url2'),
        ['200']: defaultKeyserverInfo('url3'),
      },
    };

    const deleteAccountAction = {
      type: deleteKeyserverAccountActionTypes.success,
      payload: {
        currentUserInfo: { anonymous: true },
        preRequestUserState: {
          cookiesAndSessions: {},
          currentUserInfo: {
            id: '1000',
            username: 'test',
          },
        },
        keyserverIDs: ['100', '200'],
      },
      loadingInfo: {
        fetchIndex: 1,
        trackMultipleRequests: false,
        customKeyName: undefined,
      },
    };

    expect(
      reduceKeyserverStore(oldKeyserverStore, deleteAccountAction, false)
        .keyserverStore,
    ).toEqual({ keyserverInfos: { ['0']: defaultKeyserverInfo('url1') } });
  });
  it('update keyserverInfo with authoritativeKeyserverID', () => {
    const defaultAshoatKeyserverInfo = defaultKeyserverInfo('url1');
    const oldKeyserverStore = {
      keyserverInfos: {
        [authoritativeKeyserverID()]: {
          ...defaultAshoatKeyserverInfo,
          connection: {
            ...defaultAshoatKeyserverInfo.connection,
            connectionIssue: 'client_version_unsupported',
          },
        },
      },
    };

    const deleteAccountAction = {
      type: deleteKeyserverAccountActionTypes.success,
      payload: {
        currentUserInfo: { anonymous: true },
        preRequestUserState: {
          cookiesAndSessions: {},
          currentUserInfo: {
            id: '1000',
            username: 'test',
          },
        },
        keyserverIDs: [authoritativeKeyserverID()],
      },
      loadingInfo: {
        fetchIndex: 1,
        trackMultipleRequests: false,
        customKeyName: undefined,
      },
    };

    expect(
      reduceKeyserverStore(oldKeyserverStore, deleteAccountAction, false)
        .keyserverStore.keyserverInfos[authoritativeKeyserverID()].connection
        .connectionIssue,
    ).toEqual(null);
  });

  it('return the same keyserverInfo with authoritativeKeyserverID()', () => {
    const defaultAshoatKeyserverInfo = defaultKeyserverInfo('url1');
    const oldKeyserverStore = {
      keyserverInfos: {
        [authoritativeKeyserverID()]: {
          ...defaultAshoatKeyserverInfo,
          connection: {
            ...defaultAshoatKeyserverInfo.connection,
            connectionIssue: 'client_version_unsupported',
          },
        },
      },
    };

    const deleteAccountAction = {
      type: deleteKeyserverAccountActionTypes.success,
      payload: {
        currentUserInfo: { anonymous: true },
        preRequestUserState: {
          cookiesAndSessions: {},
          currentUserInfo: {
            id: '1000',
            username: 'test',
          },
        },
        keyserverIDs: ['100', '200'],
      },
      loadingInfo: {
        fetchIndex: 1,
        trackMultipleRequests: false,
        customKeyName: undefined,
      },
    };

    expect(
      reduceKeyserverStore(oldKeyserverStore, deleteAccountAction, false)
        .keyserverStore.keyserverInfos[authoritativeKeyserverID()].connection
        .connectionIssue,
    ).toEqual('client_version_unsupported');
  });
});
