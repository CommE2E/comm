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
          supportsFarcasterDCs: true,
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
          supportsFarcasterDCs: true,
        },
        userID_2: {
          fid: 'farcasterID_2',
          supportsFarcasterDCs: false,
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
            supportsFarcasterDCs: false,
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
          supportsFarcasterDCs: false,
        },
        userID_2: {
          fid: 'farcasterID_2',
          supportsFarcasterDCs: false,
        },
      },
    });
  });

  it('should update aux user store with device lists for users', () => {
    const oldAuxUserStore = {
      auxUserInfos: {
        userID_1: {
          fid: 'farcasterID_1',
          supportsFarcasterDCs: true,
        },
      },
    };

    const deviceList1: RawDeviceList = {
      devices: ['D1', 'D2'],
      timestamp: 1,
    };
    const devicesPlatformDetails1: {
      +[deviceID: string]: IdentityPlatformDetails,
    } = {
      D1: {
        deviceType: identityDeviceTypes.ANDROID,
        codeVersion: 350,
        stateVersion: 75,
      },
      D2: {
        deviceType: identityDeviceTypes.WINDOWS,
        codeVersion: 80,
        stateVersion: 75,
      },
    };
    const deviceList2: RawDeviceList = {
      devices: ['D3'],
      timestamp: 1,
    };
    const devicesPlatformDetails2: {
      +[deviceID: string]: IdentityPlatformDetails,
    } = {
      D3: {
        deviceType: identityDeviceTypes.IOS,
        codeVersion: 350,
        stateVersion: 75,
      },
    };

    const updateAuxUserInfosAction = {
      type: setPeerDeviceListsActionType,
      payload: {
        deviceLists: {
          userID_1: deviceList1,
          userID_2: deviceList2,
        },
        usersPlatformDetails: {
          userID_1: devicesPlatformDetails1,
          userID_2: devicesPlatformDetails2,
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
          supportsFarcasterDCs: true,
          deviceList: deviceList1,
          devicesPlatformDetails: devicesPlatformDetails1,
        },
        userID_2: {
          fid: null,
          supportsFarcasterDCs: false,
          deviceList: deviceList2,
          devicesPlatformDetails: devicesPlatformDetails2,
        },
      },
    });
  });
});
