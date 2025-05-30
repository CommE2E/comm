// @flow

export type SyncedMetadata = { +[name: string]: string };

export type SyncedMetadataStore = {
  +syncedMetadata: SyncedMetadata,
};

const syncedMetadataNames = Object.freeze({
  CURRENT_USER_FID: 'current_user_fid',
  STORE_VERSION: 'store_version',
});
type SyncedMetadataName = $Values<typeof syncedMetadataNames>;

export type SetSyncedMetadataEntryPayload = {
  +name: SyncedMetadataName,
  +data: string,
};

export type ClearSyncedMetadataEntryPayload = {
  +name: SyncedMetadataName,
};

export { syncedMetadataNames };
