// @flow

import { addCommunityActionType } from '../actions/community-actions.js';
import {
  communityStoreOpsHandlers,
  type CommunityStoreOperation,
  type ReplaceCommunityOperation,
} from '../ops/community-store-ops.js';
import type { CommunityStore } from '../types/community-types.js';
import type { BaseAction } from '../types/redux-types';

const { processStoreOperations: processStoreOps } = communityStoreOpsHandlers;

// double check about needing onStateDifference
export default function reduceCommunityStore(
  state: CommunityStore,
  action: BaseAction,
): {
  communityStore: CommunityStore,
  communityStoreOperations: $ReadOnlyArray<CommunityStoreOperation>,
} {
  if (action.type === addCommunityActionType) {
    const replaceOperation: ReplaceCommunityOperation = {
      type: 'replace_community',
      payload: {
        id: action.payload.id,
        communityInfo: {
          ...action.payload.newCommunityInfo,
        },
      },
    };

    return {
      communityStore: processStoreOps(state, [replaceOperation]),
      communityStoreOperations: [replaceOperation],
    };
  }

  return {
    communityStore: state,
    communityStoreOperations: [],
  };
}
