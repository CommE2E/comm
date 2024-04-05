// @flow

export type SyncedMetadata = { +[name: string]: string };

export type SyncedMetadataStore = {
  +syncedMetadata: SyncedMetadata,
};

export type SetSyncedMetadataEntryPayload = {
  +name: string,
  +data: string,
};

export type ClearSyncedMetadataEntryPayload = {
  +name: string,
};
