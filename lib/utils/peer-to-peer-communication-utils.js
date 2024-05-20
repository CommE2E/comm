// @flow

import { getUUID } from './uuid.js';
import {
  addKeyserverActionType,
  removeKeyserverActionType,
} from '../actions/keyserver-actions.js';
import type { AuxUserStore } from '../types/aux-user-types.js';
import { defaultKeyserverInfo } from '../types/keyserver-types.js';
import type { BaseAction } from '../types/redux-types.js';
import type { OutboundP2PMessage } from '../types/sqlite-types.js';
import { outboundP2PMessageStatuses } from '../types/sqlite-types.js';
import {
  type AddKeyserverP2PMessage,
  type SyncingP2PMessage,
  syncingP2PMessageTypes,
  type RemoveKeyserverP2PMessage,
} from '../types/tunnelbroker/syncing-peer-to-peer-message-types.js';
import type { CurrentUserInfo } from '../types/user-types.js';

function getClientMessageIDFromTunnelbrokerMessageID(
  clientMessageID: string,
): string {
  return clientMessageID.split('#')[1];
}

function generateMessagesToPeers(
  message: SyncingP2PMessage,
  peers: $ReadOnlyArray<string>,
  userID: string,
): $ReadOnlyArray<OutboundP2PMessage> {
  let outboundP2PMessages: $ReadOnlyArray<OutboundP2PMessage> = [];
  for (const peerID of peers) {
    const messageToPeer: OutboundP2PMessage = {
      messageID: getUUID(),
      deviceID: peerID,
      userID,
      timestamp: new Date().getTime().toString(),
      plaintext: JSON.stringify(message),
      ciphertext: '',
      status: outboundP2PMessageStatuses.addressed,
    };
    outboundP2PMessages = [...outboundP2PMessages, messageToPeer];
  }
  return outboundP2PMessages;
}

function getOutboundP2PMessagesFromAction(
  action: BaseAction,
  auxUserStore: AuxUserStore,
  currentUserInfo: ?CurrentUserInfo,
): $ReadOnlyArray<OutboundP2PMessage> {
  if (action.messageSourceMetadata) {
    return [];
  }
  if (!currentUserInfo?.id) {
    return [];
  }
  if (action.type === addKeyserverActionType) {
    const ownPeers =
      auxUserStore.auxUserInfos[currentUserInfo.id].deviceList?.devices;
    if (!ownPeers) {
      return [];
    }

    const addKeyserverP2PMessage: AddKeyserverP2PMessage = {
      type: syncingP2PMessageTypes.ADD_KEYSERVER,
      keyserverAdminUserID: action.payload.keyserverAdminUserID,
      urlPrefix: action.payload.newKeyserverInfo.urlPrefix,
    };
    return generateMessagesToPeers(
      addKeyserverP2PMessage,
      ownPeers,
      currentUserInfo.id,
    );
  } else if (action.type === removeKeyserverActionType) {
    const ownPeers =
      auxUserStore.auxUserInfos[currentUserInfo.id].deviceList?.devices;
    if (!ownPeers) {
      return [];
    }

    const removeKeyserverP2PMessage: RemoveKeyserverP2PMessage = {
      type: syncingP2PMessageTypes.REMOVE_KEYSERVER,
      keyserverAdminUserID: action.payload.keyserverAdminUserID,
    };
    return generateMessagesToPeers(
      removeKeyserverP2PMessage,
      ownPeers,
      currentUserInfo.id,
    );
  }
  return [];
}

function getActionFromOutboundP2PMessage(
  syncingP2PMessage: SyncingP2PMessage,
): ?BaseAction {
  if (syncingP2PMessage.type === syncingP2PMessageTypes.ADD_KEYSERVER) {
    return {
      type: addKeyserverActionType,
      payload: {
        keyserverAdminUserID: syncingP2PMessage.keyserverAdminUserID,
        newKeyserverInfo: defaultKeyserverInfo(
          syncingP2PMessage.keyserverAdminUserID,
        ),
      },
    };
  } else if (
    syncingP2PMessage.type === syncingP2PMessageTypes.REMOVE_KEYSERVER
  ) {
    return {
      type: removeKeyserverActionType,
      payload: {
        keyserverAdminUserID: syncingP2PMessage.keyserverAdminUserID,
      },
    };
  }
  return null;
}

export {
  getClientMessageIDFromTunnelbrokerMessageID,
  getOutboundP2PMessagesFromAction,
  getActionFromOutboundP2PMessage,
};
