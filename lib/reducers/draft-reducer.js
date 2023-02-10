// @flow

import { setClientDBStoreActionType } from '../actions/client-db-store-actions.js';
import {
  moveDraftActionType,
  updateDraftActionType,
} from '../actions/draft-actions.js';
import {
  deleteAccountActionTypes,
  logOutActionTypes,
} from '../actions/user-actions.js';
import type { DraftStore, DraftStoreOperation } from '../types/draft-types.js';
import type { BaseAction } from '../types/redux-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

type ReduceDraftStoreResult = {
  +draftStoreOperations: $ReadOnlyArray<DraftStoreOperation>,
  +draftStore: DraftStore,
};

function reduceDraftStore(
  draftStore: DraftStore,
  action: BaseAction,
): ReduceDraftStoreResult {
  if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {
      draftStoreOperations: [{ type: 'remove_all' }],
      draftStore: { drafts: {} },
    };
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
    const drafts = {};
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

export { reduceDraftStore };
