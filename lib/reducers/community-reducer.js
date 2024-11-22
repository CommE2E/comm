// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  addCommunityActionType,
  fetchCommunityInfosActionTypes,
  createOrUpdateFarcasterChannelTagActionTypes,
  deleteFarcasterChannelTagActionTypes,
  fetchAllCommunityInfosWithNamesActionTypes,
} from '../actions/community-actions.js';
import {
  communityStoreOpsHandlers,
  type CommunityStoreOperation,
  type ReplaceCommunityOperation,
} from '../ops/community-store-ops.js';
import { viewerIsMember } from '../shared/thread-utils.js';
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
  if (action.type === fetchCommunityInfosActionTypes.success) {
    const replaceOperations = action.payload.communityInfos.map(community => {
      const { id, ...communityInfo } = community;

      return {
        type: 'replace_community',
        payload: {
          id,
          communityInfo,
        },
      };
    });

    return {
      communityStore: processStoreOps(state, replaceOperations),
      communityStoreOperations: replaceOperations,
    };
  } else if (
    action.type === fetchAllCommunityInfosWithNamesActionTypes.success
  ) {
    const replaceOperations = action.payload.allCommunityInfosWithNames
      .filter(community => viewerIsMember(community.threadInfo))
      .map(community => {
        const { id, threadInfo, communityName, ...communityInfo } = community;

        return {
          type: 'replace_community',
          payload: {
            id,
            communityInfo,
          },
        };
      });

    return {
      communityStore: processStoreOps(state, replaceOperations),
      communityStoreOperations: replaceOperations,
    };
  } else if (
    action.type === createOrUpdateFarcasterChannelTagActionTypes.success
  ) {
    const communityID = action.payload.commCommunityID;

    const replaceOperation: ReplaceCommunityOperation = {
      type: 'replace_community',
      payload: {
        id: communityID,
        communityInfo: {
          ...state.communityInfos[communityID],
          farcasterChannelID: action.payload.farcasterChannelID,
        },
      },
    };

    return {
      communityStore: processStoreOps(state, [replaceOperation]),
      communityStoreOperations: [replaceOperation],
    };
  } else if (action.type === deleteFarcasterChannelTagActionTypes.success) {
    const communityID = action.payload.commCommunityID;

    const replaceOperation: ReplaceCommunityOperation = {
      type: 'replace_community',
      payload: {
        id: communityID,
        communityInfo: {
          ...state.communityInfos[communityID],
          farcasterChannelID: null,
        },
      },
    };

    return {
      communityStore: processStoreOps(state, [replaceOperation]),
      communityStoreOperations: [replaceOperation],
    };
  } else if (action.type === addCommunityActionType) {
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
