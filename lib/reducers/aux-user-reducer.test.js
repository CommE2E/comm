// @flow

import { reduceAuxUserStore } from './aux-user-reducer.js';
import { setAuxUserFIDsActionType } from '../actions/aux-user-actions.js';

jest.mock('../utils/config.js');

describe('reduceAuxUserStore', () => {
  it('should update aux user store with farcaster data for user', () => {
    const oldAuxUserStore = {
      auxUserInfos: {},
    };

    const updateAuxUserInfosAction = {
      type: setAuxUserFIDsActionType,
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
});
