// @flow

export const storeEstablishedHolderActionType = 'STORE_ESTABLISHED_HOLDER';
export type StoreEstablishedHolderPayload = {
  +blobHash: string,
  +holder: string,
};
