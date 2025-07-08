// @flow

import invariant from 'invariant';

export const holderStatuses = Object.freeze({
  PENDING_ESTABLISHMENT: 'PENDING_ESTABLISHMENT',
  ESTABLISHED: 'ESTABLISHED',
  NOT_ESTABLISHED: 'NOT_ESTABLISHED',
  PENDING_REMOVAL: 'PENDING_REMOVAL',
  NOT_REMOVED: 'NOT_REMOVED',
});
export type HolderStatus = $Values<typeof holderStatuses>;

export function assertHolderStatus(holderStatus: string): HolderStatus {
  invariant(
    holderStatus === 'PENDING_ESTABLISHMENT' ||
      holderStatus === 'ESTABLISHED' ||
      holderStatus === 'NOT_ESTABLISHED' ||
      holderStatus === 'PENDING_REMOVAL' ||
      holderStatus === 'NOT_REMOVED',
    'string is not HolderStatus enum',
  );
  return holderStatus;
}

export function shouldHolderExist(holderStatus: HolderStatus): boolean {
  return (
    holderStatus === holderStatuses.PENDING_ESTABLISHMENT ||
    holderStatus === holderStatuses.ESTABLISHED ||
    holderStatus === holderStatuses.NOT_ESTABLISHED
  );
}

export type HolderInfo = {
  +holder: string,
  +status: HolderStatus,
};

export type StoredHolders = {
  +[blobHash: string]: HolderInfo,
};

export type HolderStore = {
  +storedHolders: StoredHolders,
};

export type BlobOperation = {
  +type: 'establish_holder' | 'remove_holder',
  +blobHash: string,
};

export type BlobHashAndHolder = {
  +blobHash: string,
  +holder: string,
};

export type HolderItem = {
  +hash: string,
  +holder: string,
  +status: HolderStatus,
};

export type ClientDBHolderItem = {
  +hash: string,
  +holder: string,
  +status: string,
};
