// @flow

export type SyncedMetadata = { +[name: string]: string };

export type SyncedMetadataStore = {
  +syncedMetadata: SyncedMetadata,
};

export type addSyncedMetadataEntryPayload = {
  +name: string,
  +data: string,
};

export type removeSyncedMetadataEntryPayload = {
  +name: string,
};
