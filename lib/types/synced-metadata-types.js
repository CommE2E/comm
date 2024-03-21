// @flow

export type SyncedMetadata = { +[name: string]: string };

export type SyncedMetadataStore = {
  +syncedMetadata: SyncedMetadata,
};
