// @flow

import {
  auxUserStoreOpsHandlers,
  type AuxUserStoreOperation,
  // type ReplaceAuxUserInfoOperation,
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
  // TODO: WIP - finish implementing this reducer
  console.log('action', action);
  console.log('processStoreOps', processStoreOps);
  // if (action.type === 'setFarcasterFriedIDs') {
  //   const replaceOperations: ReplaceAuxUserInfoOperation[] = [];
  //   for (const userID of action.payload.userIDs) {
  //     replaceOperations.push({
  //       type: 'replace_aux_user_info',
  //       payload: {
  //         id: userID,
  //         auxUserInfo: {
  //           ...state.auxUserInfos[userID],
  //           farcasterID: '1', // TODO: fix this
  //         },
  //       },
  //     });
  //   }

  //   return {
  //     auxUserStore: processStoreOps(state, replaceOperations),
  //     auxUserStoreOperations: replaceOperations,
  //   };
  // }
  return {
    auxUserStore: state,
    auxUserStoreOperations: [],
  };
}

export { reduceAuxUserStore };
