// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  moveDraftActionType,
  updateDraftActionType,
} from '../actions/draft-actions.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { DraftStore, DraftStoreOperation } from '../types/draft-types.js';
import type { BaseAction } from '../types/redux-types.js';

type ReduceDraftStoreResult = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +draftStore: DraftStore,
};

function removeKeyserversDraftsFromStore(
  draftStore: DraftStore,
  keyserverIDs: $ReadOnlyArray<string>,
): ReduceDraftStoreResult {
  const keyserverIDsSet = new Set<string>(keyserverIDs);

  const drafts: { [key: string]: string } = {};
  const ids: string[] = [];
  for (const key in draftStore.drafts) {
    const keyserverID = extractKeyserverIDFromID(key);
    if (keyserverID && keyserverIDsSet.has(keyserverID)) {
      ids.push(key);
    } else {
      drafts[key] = draftStore.drafts[key];
    }
  }

  return {
    draftStoreOperations: [{ type: 'remove', payload: { ids } }],
    draftStore: { ...draftStore, drafts },
  };
}

function reduceDraftStore(
  draftStore: DraftStore,
  action: BaseAction,
): ReduceDraftStoreResult {
  if (action.type === deleteKeyserverAccountActionTypes.success) {
    return removeKeyserversDraftsFromStore(
      draftStore,
      action.payload.keyserverIDs,
    );
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    return removeKeyserversDraftsFromStore(draftStore, [
      action.payload.keyserverID,
    ]);
  } else if (action.type === updateDraftActionType) {
    const { key, text } = action.payload;

    const draftStoreOperations = [
      {
        type: 'update',
        payload: { key, text },
      },
    ];
    return {
      draftStoreOperations,
      draftStore: {
        ...draftStore,
        drafts: {
          ...draftStore.drafts,
          [key]: text,
        },
      },
    };
  } else if (action.type === moveDraftActionType) {
    const { oldKey, newKey } = action.payload;

    const draftStoreOperations = [
      {
        type: 'move',
        payload: { oldKey, newKey },
      },
    ];

    const { [oldKey]: text, ...draftsWithoutOldKey } = draftStore.drafts;
    return {
      draftStoreOperations,
      draftStore: {
        ...draftStore,
        drafts: {
          ...draftsWithoutOldKey,
          [newKey]: text,
        },
      },
    };
  } else if (action.type === setClientDBStoreActionType) {
    const drafts: { [string]: string } = {};
    for (const dbDraftInfo of action.payload.drafts) {
      drafts[dbDraftInfo.key] = dbDraftInfo.text;
    }
    return {
      draftStoreOperations: [],
      draftStore: {
        ...draftStore,
        drafts: drafts,
      },
    };
  }
  return { draftStore, draftStoreOperations: [] };
}

export { reduceDraftStore, removeKeyserversDraftsFromStore };
