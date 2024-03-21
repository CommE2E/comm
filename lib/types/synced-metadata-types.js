// @flow

export type FarcasterMetadata = {
  +current_user_farcaster_fid_key: string,
};

export type FarcasterMetadatas = {
  +[current_user_farcaster_data: string]: FarcasterMetadata,
};

export type FarcasterMetadataStore = {
  +farcasterMetadatas: FarcasterMetadatas,
};
