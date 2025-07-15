// @flow

export type SyncedMetadata = { +[name: string]: string };

export type SyncedMetadataStore = {
  +syncedMetadata: SyncedMetadata,
};

const syncedMetadataNames = Object.freeze({
  CURRENT_USER_FID: 'current_user_fid',
  CURRENT_USER_SUPPORTS_DCS: 'current_user_supports_dcs',
  STORE_VERSION: 'store_version',
  ENABLED_APPS: 'enabled_apps',
  GLOBAL_THEME_INFO: 'global_theme_info',
  ALERT_STORE: 'alert_store',
  CURRENT_USER_INFO: 'current_user_info',
});
export type SyncedMetadataName = $Values<typeof syncedMetadataNames>;

export type SetSyncedMetadataEntryPayload = {
  +name: SyncedMetadataName,
  +data: string,
};

export type ClearSyncedMetadataEntryPayload = {
  +name: SyncedMetadataName,
};

export { syncedMetadataNames };
