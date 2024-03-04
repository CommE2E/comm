// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import { addCommunityActionType } from '../actions/community-actions.js';
import {
  communityStoreOpsHandlers,
  type CommunityStoreOperation,
  type ReplaceCommunityOperation,
} from '../ops/community-store-ops.js';
import type { CommunityStore } from '../types/community-types.js';
import type { BaseAction } from '../types/redux-types';

const { processStoreOperations: processStoreOps } = communityStoreOpsHandlers;

function reduceCommunityStore(
  state: CommunityStore,
  action: BaseAction,
): {
  +communityStore: CommunityStore,
  +communityStoreOperations: $ReadOnlyArray<CommunityStoreOperation>,
} {
  if (action.type === addCommunityActionType) {
    const replaceOperation: ReplaceCommunityOperation = {
      type: 'replace_community',
      payload: {
        id: action.payload.id,
        communityInfo: action.payload.newCommunityInfo,
      },
    };

    return {
      communityStore: processStoreOps(state, [replaceOperation]),
      communityStoreOperations: [replaceOperation],
    };
  } else if (action.type === setClientDBStoreActionType) {
    const newCommunityInfo = action.payload.communityInfos;

    if (!newCommunityInfo) {
      return {
        communityStore: state,
        communityStoreOperations: [],
      };
    }

    const newCommunityStore: CommunityStore = {
      ...state,
      communityInfos: newCommunityInfo,
    };

    return {
      communityStore: newCommunityStore,
      communityStoreOperations: [],
    };
  }

  return {
    communityStore: state,
    communityStoreOperations: [],
  };
}

export { reduceCommunityStore };
