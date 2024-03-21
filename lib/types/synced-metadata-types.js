// @flow

export type SyncedMetadata = {
  +current_user_farcaster_fid_key: string,
};

export type SyncedMetadatas = {
  +[current_user_farcaster_data: string]: SyncedMetadata,
};

export type SyncedMetadataStore = {
  +farcasterMetadatas: SyncedMetadatas,
};
