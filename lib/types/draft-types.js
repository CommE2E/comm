// @flow

export type DraftStore = {
  +drafts: { +[key: string]: string },
};

export type ClientDBDraftInfo = {
  +key: string,
  +text: string,
};

export type UpdateDraftOperation = {
  +type: 'update',
  +payload: { +key: string, +text: string },
};

export type MoveDraftOperation = {
  +type: 'move',
  +payload: { +oldKey: string, +newKey: string },
};

export type RemoveAllDraftsOperation = {
  +type: 'remove_all',
};

export type RemoveDraftsOperation = {
  +type: 'remove',
  +payload: { +ids: $ReadOnlyArray<string> },
};

export type DraftStoreOperation =
  | UpdateDraftOperation
  | MoveDraftOperation
  | RemoveAllDraftsOperation
  | RemoveDraftsOperation;

export type ClientDBDraftStoreOperation = DraftStoreOperation;
