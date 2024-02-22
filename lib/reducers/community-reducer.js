// @flow

import { addCommunityActionType } from '../actions/community-actions.js';
import { siweAuthActionTypes } from '../actions/siwe-actions.js';
import {
  logInActionTypes,
  keyserverRegisterActionTypes,
} from '../actions/user-actions.js';
import {
  communityStoreOpsHandlers,
  type CommunityStoreOperation,
  type ReplaceCommunityOperation,
  type RemoveAllCommunitiesOperation,
} from '../ops/community-store-ops.js';
import type {
  CommunityStore,
  CommunityInfo,
} from '../types/community-types.js';
import { defaultEnabledApps } from '../types/enabled-apps.js';
import type { BaseAction } from '../types/redux-types';
import type { RawThreadInfos } from '../types/thread-types';
import { threadTypeIsCommunityRoot } from '../types/thread-types-enum.js';

const { processStoreOperations: processStoreOps } = communityStoreOpsHandlers;

export default function reduceCommunityStore(
  state: CommunityStore,
  action: BaseAction,
  newThreadInfos: RawThreadInfos,
): {
  communityStore: CommunityStore,
  communityStoreOperations: $ReadOnlyArray<CommunityStoreOperation>,
} {
  if (
    action.type === logInActionTypes.success ||
    action.type === siweAuthActionTypes.success ||
    action.type === keyserverRegisterActionTypes.success
  ) {
    const removeAllOpertation: RemoveAllCommunitiesOperation = {
      type: 'remove_all_communities',
    };

    const replaceOperations = Object.keys(newThreadInfos)
      .filter(threadID =>
        threadTypeIsCommunityRoot(newThreadInfos[threadID].type),
      )
      .map(threadID => {
        const communityInfo: CommunityInfo = {
          enabledApps: defaultEnabledApps,
        };
        return {
          type: 'replace_community',
          payload: {
            id: threadID,
            communityInfo,
          },
        };
      });

    const commmunityStoreOperations = [
      removeAllOpertation,
      ...replaceOperations,
    ];

    return {
      communityStore: processStoreOps(state, commmunityStoreOperations),
      communityStoreOperations: commmunityStoreOperations,
    };
  } else if (action.type === addCommunityActionType) {
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
