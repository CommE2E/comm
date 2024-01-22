// @flow

import reduceKeyserverStore from './keyserver-reducer.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';

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
});
