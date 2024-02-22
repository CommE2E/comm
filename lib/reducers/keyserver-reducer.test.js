// @flow

import reduceKeyserverStore from './keyserver-reducer.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

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
      reduceKeyserverStore(oldKeyserverStore, deleteAccountAction)
        .keyserverStore,
    ).toEqual({ keyserverInfos: { ['0']: defaultKeyserverInfo('url1') } });
  });
  it('update keyserverInfo with ashoatKeyserverID', () => {
    const defaultAshoatKeyserverInfo = defaultKeyserverInfo('url1');
    const oldKeyserverStore = {
      keyserverInfos: {
        [ashoatKeyserverID]: {
          ...defaultAshoatKeyserverInfo,
          connection: {
            ...defaultAshoatKeyserverInfo.connection,
            connectionIssue: 'not_logged_in_error',
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
        keyserverIDs: [ashoatKeyserverID],
      },
      loadingInfo: {
        fetchIndex: 1,
        trackMultipleRequests: false,
        customKeyName: undefined,
      },
    };

    expect(
      reduceKeyserverStore(oldKeyserverStore, deleteAccountAction)
        .keyserverStore.keyserverInfos[ashoatKeyserverID].connection
        .connectionIssue,
    ).toEqual(null);
  });

  it('return the same keyserverInfo with ashoatKeyserverID', () => {
    const defaultAshoatKeyserverInfo = defaultKeyserverInfo('url1');
    const oldKeyserverStore = {
      keyserverInfos: {
        [ashoatKeyserverID]: {
          ...defaultAshoatKeyserverInfo,
          connection: {
            ...defaultAshoatKeyserverInfo.connection,
            connectionIssue: 'not_logged_in_error',
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
      reduceKeyserverStore(oldKeyserverStore, deleteAccountAction)
        .keyserverStore.keyserverInfos[ashoatKeyserverID].connection
        .connectionIssue,
    ).toEqual('not_logged_in_error');
  });
});
