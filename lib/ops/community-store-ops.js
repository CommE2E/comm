// @flow

import type { BaseStoreOpsHandlers } from './base-ops.js';
import type {
  CommunityInfo,
  CommunityInfos,
  CommunityStore,
} from '../types/community-types.js';

// client types
export type ReplaceCommunityOperation = {
  +type: 'replace_community',
  +payload: { +id: string, +communityInfo: CommunityInfo },
};

export type RemoveCommunitiesOperation = {
  +type: 'remove_communities',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllCommunitiesOperation = {
  +type: 'remove_all_communities',
};

export type CommunityStoreOperation =
  | ReplaceCommunityOperation
  | RemoveCommunitiesOperation
  | RemoveAllCommunitiesOperation;

// SQLite types
export type ClientDBCommunityInfo = {
  +id: string,
  +communityInfo: string,
};

export type ClientDBReplaceCommunityOperation = {
  +type: 'replace_community',
  +payload: ClientDBCommunityInfo,
};

export type ClientDBCommunityStoreOperation =
  | ClientDBReplaceCommunityOperation
  | RemoveCommunitiesOperation
  | RemoveAllCommunitiesOperation;

function convertCommunityInfoToClientDBCommunityInfo({
  id,
  communityInfo,
}: {
  +id: string,
  +communityInfo: CommunityInfo,
}): ClientDBCommunityInfo {
  return {
    id,
    communityInfo: JSON.stringify(communityInfo),
  };
}

const communityStoreOpsHandlers: BaseStoreOpsHandlers<
  CommunityStore,
  CommunityStoreOperation,
  ClientDBCommunityStoreOperation,
  CommunityInfos,
  ClientDBCommunityInfo,
> = {
  processStoreOperations(
    communityStore: CommunityStore,
    ops: $ReadOnlyArray<CommunityStoreOperation>,
  ): CommunityStore {
    if (ops.length === 0) {
      return communityStore;
    }

    let processedCommunityInfos = { ...communityStore.communityInfos };

    for (const operation of ops) {
      if (operation.type === 'replace_community') {
        processedCommunityInfos[operation.payload.id] =
          operation.payload.communityInfo;
      } else if (operation.type === 'remove_communities') {
        for (const id of operation.payload.ids) {
          delete processedCommunityInfos[id];
        }
      } else if (operation.type === 'remove_all_communities') {
        processedCommunityInfos = {};
      }
    }

    return { ...communityStore, communityInfos: processedCommunityInfos };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<CommunityStoreOperation>,
  ): $ReadOnlyArray<ClientDBCommunityStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops.map(operation => {
      if (
        operation.type === 'remove_communities' ||
        operation.type === 'remove_all_communities'
      ) {
        return operation;
      }

      return {
        type: 'replace_community',
        payload: convertCommunityInfoToClientDBCommunityInfo(operation.payload),
      };
    });
  },

  translateClientDBData(
    communites: $ReadOnlyArray<ClientDBCommunityInfo>,
  ): CommunityInfos {
    const communityInfos: { [id: string]: CommunityInfo } = {};

    communites.forEach(dbCommunity => {
      communityInfos[dbCommunity.id] = JSON.parse(dbCommunity.communityInfo);
    });

    return communityInfos;
  },
};

export {
  communityStoreOpsHandlers,
  convertCommunityInfoToClientDBCommunityInfo,
};
