// @flow

import { reduceAuxUserStore } from './aux-user-reducer.js';
import {
  addAuxUserFIDsActionType,
  setAuxUserFIDsActionType,
  setPeerDeviceListsActionType,
} from '../actions/aux-user-actions.js';
import {
  type RawDeviceList,
  type IdentityPlatformDetails,
  identityDeviceTypes,
} from '../types/identity-service-types.js';

jest.mock('../utils/config.js');

describe('reduceAuxUserStore', () => {
  it('should update aux user store with farcaster data for user2', () => {
    const oldAuxUserStore = {
      auxUserInfos: {
        userID_1: {
          fid: 'farcasterID_1',
        },
      },
    };

    const updateAuxUserInfosAction = {
      type: addAuxUserFIDsActionType,
      payload: {
        farcasterUsers: [
          {
            userID: 'userID_2',
            username: 'username_2',
            farcasterID: 'farcasterID_2',
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
        userID_2: {
          fid: 'farcasterID_2',
        },
      },
    });
  });

  it('should set aux user store user1 fid to null and add user2', () => {
    const oldAuxUserStore = {
      auxUserInfos: {
        userID_1: {
          fid: 'farcasterID_1',
        },
      },
    };

    const updateAuxUserInfosAction = {
      type: setAuxUserFIDsActionType,
      payload: {
        farcasterUsers: [
          {
            userID: 'userID_2',
            username: 'username_2',
            farcasterID: 'farcasterID_2',
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
          fid: null,
        },
        userID_2: {
          fid: 'farcasterID_2',
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
    const platformDetails1: IdentityPlatformDetails = {
      deviceType: identityDeviceTypes.ANDROID,
      codeVersion: 350,
    };
    const deviceList2: RawDeviceList = {
      devices: ['D3'],
      timestamp: 1,
    };
    const platformDetails2: IdentityPlatformDetails = {
      deviceType: identityDeviceTypes.IOS,
      codeVersion: 349,
    };

    const updateAuxUserInfosAction = {
      type: setPeerDeviceListsActionType,
      payload: {
        deviceLists: {
          userID_1: deviceList1,
          userID_2: deviceList2,
        },
        usersPlatformDetails: {
          userID_1: platformDetails1,
          userID_2: platformDetails2,
        },
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
          platformDetails: platformDetails1,
        },
        userID_2: {
          fid: null,
          deviceList: deviceList2,
          platformDetails: platformDetails2,
        },
      },
    });
  });
});
