// @flow

import { reduceAuxUserStore } from './aux-user-reducer.js';
import {
  setFarcasterFriendsFIDActionType,
  setUsersDeviceListsActionType,
} from '../actions/aux-user-actions.js';
import type { RawDeviceList } from '../types/identity-service-types.js';

jest.mock('../utils/config.js');

describe('reduceAuxUserStore', () => {
  it('should update aux user store with farcaster data for user', () => {
    const oldAuxUserStore = {
      auxUserInfos: {},
    };

    const updateAuxUserInfosAction = {
      type: setFarcasterFriendsFIDActionType,
      payload: {
        farcasterUsers: [
          {
            userID: 'userID_1',
            username: 'username_1',
            farcasterID: 'farcasterID_1',
          },
        ],
      },
    };

    expect(
      reduceAuxUserStore(oldAuxUserStore, updateAuxUserInfosAction)
        .auxUserStore,
    ).toEqual({
      auxUserInfos: {
        userID_1: {
          fid: 'farcasterID_1',
        },
      },
    });
  });

  it('should update aux user store with device lists for users', () => {
    const oldAuxUserStore = {
      auxUserInfos: {
        userID_1: {
          fid: 'farcasterID_1',
        },
      },
    };

    const deviceList1: RawDeviceList = {
      devices: ['D1', 'D2'],
      timestamp: 1,
    };
    const deviceList2: RawDeviceList = {
      devices: ['D3'],
      timestamp: 1,
    };

    const updateAuxUserInfosAction = {
      type: setUsersDeviceListsActionType,
      payload: {
        userID_1: deviceList1,
        userID_2: deviceList2,
      },
    };

    expect(
      reduceAuxUserStore(oldAuxUserStore, updateAuxUserInfosAction)
        .auxUserStore,
    ).toEqual({
      auxUserInfos: {
        userID_1: {
          fid: 'farcasterID_1',
          deviceList: deviceList1,
        },
        userID_2: {
          fid: null,
          deviceList: deviceList2,
        },
      },
    });
  });
});
