// @flow

import type { BaseStoreOpsHandlers } from './base-ops.js';
import type {
  AuxUserInfo,
  AuxUserInfos,
  AuxUserStore,
} from '../types/aux-user-types.js';

// client types
export type ReplaceAuxUserInfoOperation = {
  +type: 'replace_aux_user_info',
  +payload: { +id: string, +auxUserInfo: AuxUserInfo },
};

export type RemoveAuxUserInfosOperation = {
  +type: 'remove_aux_user_infos',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type RemoveAllAuxUserInfosOperation = {
  +type: 'remove_all_aux_user_infos',
};

export type AuxUserStoreOperation =
  | ReplaceAuxUserInfoOperation
  | RemoveAuxUserInfosOperation
  | RemoveAllAuxUserInfosOperation;

// SQLite types
export type ClientDBAuxUserInfo = {
  +id: string,
  +auxUserInfo: string,
};

export type ClientDBReplaceAuxUserOperation = {
  +type: 'replace_aux_user_info',
  +payload: ClientDBAuxUserInfo,
};

export type ClientDBAuxUserStoreOperation =
  | ClientDBReplaceAuxUserOperation
  | RemoveAuxUserInfosOperation
  | RemoveAllAuxUserInfosOperation;

function convertAuxUserInfoToClientDBAuxUserInfo({
  id,
  auxUserInfo,
}: {
  +id: string,
  +auxUserInfo: AuxUserInfo,
}): ClientDBAuxUserInfo {
  return {
    id,
    auxUserInfo: JSON.stringify(auxUserInfo),
  };
}

const auxUserStoreOpsHandlers: BaseStoreOpsHandlers<
  AuxUserStore,
  AuxUserStoreOperation,
  ClientDBAuxUserStoreOperation,
  AuxUserInfos,
  ClientDBAuxUserInfo,
> = {
  processStoreOperations(
    auxUserStore: AuxUserStore,
    ops: $ReadOnlyArray<AuxUserStoreOperation>,
  ): AuxUserStore {
    if (ops.length === 0) {
      return auxUserStore;
    }

    let processedAuxUserInfos = { ...auxUserStore.auxUserInfos };

    for (const operation of ops) {
      if (operation.type === 'replace_aux_user_info') {
        processedAuxUserInfos[operation.payload.id] =
          operation.payload.auxUserInfo;
      } else if (operation.type === 'remove_aux_user_infos') {
        for (const id of operation.payload.ids) {
          delete processedAuxUserInfos[id];
        }
      } else if (operation.type === 'remove_all_aux_user_infos') {
        processedAuxUserInfos = {};
      }
    }

    return { ...auxUserStore, auxUserInfos: processedAuxUserInfos };
  },

  convertOpsToClientDBOps(
    ops: ?$ReadOnlyArray<AuxUserStoreOperation>,
  ): $ReadOnlyArray<ClientDBAuxUserStoreOperation> {
    if (!ops) {
      return [];
    }
    return ops.map(operation => {
      if (
        operation.type === 'remove_aux_user_infos' ||
        operation.type === 'remove_all_aux_user_infos'
      ) {
        return operation;
      }

      return {
        type: 'replace_aux_user_info',
        payload: convertAuxUserInfoToClientDBAuxUserInfo(operation.payload),
      };
    });
  },

  translateClientDBData(
    clientDBAuxUserInfos: $ReadOnlyArray<ClientDBAuxUserInfo>,
  ): AuxUserInfos {
    const auxUserInfos: { [id: string]: AuxUserInfo } = {};

    clientDBAuxUserInfos.forEach(dbAuxUserInfo => {
      auxUserInfos[dbAuxUserInfo.id] = JSON.parse(dbAuxUserInfo.auxUserInfo);
    });

    return auxUserInfos;
  },
};

export { auxUserStoreOpsHandlers, convertAuxUserInfoToClientDBAuxUserInfo };
