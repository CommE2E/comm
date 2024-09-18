// @flow

export type HolderStatus =
  | 'PENDING_ESTABLISHMENT'
  | 'ESTABLISHED'
  | 'NOT_ESTABLISHED'
  | 'PENDING_REMOVAL'
  | 'NOT_REMOVED';

export type HolderInfo = {
  +holder: string,
  +status: HolderStatus,
};

export type HolderStore = {
  +storedHolders: {
    +[blobHash: string]: HolderInfo,
  },
};

export type BlobOperation = {
  +type: 'establish_holder' | 'remove_holder',
  +blobHash: string,
};
