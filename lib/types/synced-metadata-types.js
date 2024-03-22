// @flow

export type SyncedMetadata = { +[name: string]: string };

export type SyncedMetadataStore = {
  +syncedMetadata: SyncedMetadata,
};

export type AddSyncedMetadataEntryPayload = {
  +name: string,
  +data: string,
};

export type RemoveSyncedMetadataEntryPayload = {
  +name: string,
};
