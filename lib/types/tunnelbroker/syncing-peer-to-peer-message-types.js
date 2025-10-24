// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export const syncingP2PMessageTypes = Object.freeze({
  ADD_KEYSERVER: 'ADD_KEYSERVER',
  REMOVE_KEYSERVER: 'REMOVE_KEYSERVER',
});

export type AddKeyserverP2PMessage = {
  +type: 'ADD_KEYSERVER',
  +keyserverAdminUserID: string,
  +urlPrefix: string,
};
export const addKeyserverP2PMessageValidator: TInterface<AddKeyserverP2PMessage> =
  tShape<AddKeyserverP2PMessage>({
    type: tString(syncingP2PMessageTypes.ADD_KEYSERVER),
    keyserverAdminUserID: t.String,
    urlPrefix: t.String,
  });

export type RemoveKeyserverP2PMessage = {
  +type: 'REMOVE_KEYSERVER',
  +keyserverAdminUserID: string,
};
export const removeKeyserverP2PMessageValidator: TInterface<RemoveKeyserverP2PMessage> =
  tShape<RemoveKeyserverP2PMessage>({
    type: tString(syncingP2PMessageTypes.REMOVE_KEYSERVER),
    keyserverAdminUserID: t.String,
  });

export type SyncingP2PMessage =
  | AddKeyserverP2PMessage
  | RemoveKeyserverP2PMessage;

export const syncingP2PMessageValidator: TUnion<SyncingP2PMessage> = t.union([
  addKeyserverP2PMessageValidator,
  removeKeyserverP2PMessageValidator,
]);
