// @flow

import { setFarcasterFriendsFIDActionType } from '../actions/aux-user-actions.js';
import {
  auxUserStoreOpsHandlers,
  type AuxUserStoreOperation,
  type ReplaceAuxUserInfoOperation,
} from '../ops/aux-user-store-ops.js';
import type { AuxUserStore } from '../types/aux-user-types.js';
import type { BaseAction } from '../types/redux-types';

const { processStoreOperations: processStoreOps } = auxUserStoreOpsHandlers;

function reduceAuxUserStore(
  state: AuxUserStore,
  action: BaseAction,
): {
  +auxUserStore: AuxUserStore,
  +auxUserStoreOperations: $ReadOnlyArray<AuxUserStoreOperation>,
} {
  if (action.type === setFarcasterFriendsFIDActionType) {
    const replaceOperations: ReplaceAuxUserInfoOperation[] = [];
    action.payload.farcasterUsers.map(farcasterUser => {
      replaceOperations.push({
        type: 'replace_aux_user_info',
        payload: {
          id: farcasterUser.userID,
          auxUserInfo: {
            ...state.auxUserInfos[farcasterUser.userID],
            farcasterID: farcasterUser.farcasterID,
          },
        },
      });
    });
    return {
      auxUserStore: processStoreOps(state, replaceOperations),
      auxUserStoreOperations: replaceOperations,
    };
  }
  return {
    auxUserStore: state,
    auxUserStoreOperations: [],
  };
}

export { reduceAuxUserStore };
