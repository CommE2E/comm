// @flow

import uuid from 'uuid';

import type { ProcessDMOperationUtilities } from './dm-op-spec.js';
import { dmOpSpecs } from './dm-op-specs.js';
import type { DMOperation } from '../../types/dm-ops.js';
import type { NotificationsCreationData } from '../../types/notif-types.js';
import {
  outboundP2PMessageStatuses,
  type OutboundP2PMessage,
} from '../../types/sqlite-types.js';
import {
  type DMOperationP2PMessage,
  userActionsP2PMessageTypes,
} from '../../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';
import { getContentSigningKey } from '../../utils/crypto-utils.js';

function generateMessagesToPeers(
  message: DMOperation,
  peers: $ReadOnlyArray<{
    +userID: string,
    +deviceID: string,
  }>,
  supportsAutoRetry: boolean,
): $ReadOnlyArray<OutboundP2PMessage> {
  const opMessage: DMOperationP2PMessage = {
    type: userActionsP2PMessageTypes.DM_OPERATION,
    op: message,
  };
  const plaintext = JSON.stringify(opMessage);
  const outboundP2PMessages = [];
  for (const peer of peers) {
    const messageToPeer: OutboundP2PMessage = {
      messageID: uuid.v4(),
      deviceID: peer.deviceID,
      userID: peer.userID,
      timestamp: new Date().getTime().toString(),
      plaintext,
      ciphertext: '',
      status: outboundP2PMessageStatuses.persisted,
      supportsAutoRetry,
    };
    outboundP2PMessages.push(messageToPeer);
  }
  return outboundP2PMessages;
}

export type DMOperationSpecification = {
  +op: DMOperation,
  +supportsAutoRetry: boolean,
  +recipients:
    | { +type: 'all_peer_devices' | 'self_devices' }
    | { +type: 'some_users', +userIDs: $ReadOnlyArray<string> },
};

async function createMessagesToPeersFromDMOp(
  operation: DMOperationSpecification,
  allPeerUserIDAndDeviceIDs: $ReadOnlyArray<{
    +userID: string,
    +deviceID: string,
  }>,
  currentUserInfo: ?CurrentUserInfo,
): Promise<$ReadOnlyArray<OutboundP2PMessage>> {
  if (!currentUserInfo?.id) {
    return [];
  }

  let peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs;
  if (operation.recipients.type === 'self_devices') {
    peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs.filter(
      peer => peer.userID === currentUserInfo.id,
    );
  } else if (operation.recipients.type === 'some_users') {
    const userIDs = new Set(operation.recipients.userIDs);
    peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs.filter(peer =>
      userIDs.has(peer.userID),
    );
  }

  const thisDeviceID = await getContentSigningKey();
  const targetPeers = peerUserIDAndDeviceIDs.filter(
    peer => peer.deviceID !== thisDeviceID,
  );
  return generateMessagesToPeers(
    operation.op,
    targetPeers,
    operation.supportsAutoRetry,
  );
}

async function getNotificationsCreationDataFromDMOp(
  operation: DMOperationSpecification,
  utilities: ProcessDMOperationUtilities,
): Promise<?NotificationsCreationData> {
  const { op } = operation;
  return await dmOpSpecs[op.type].notificationsCreationData?.(op, utilities);
}

export { createMessagesToPeersFromDMOp, getNotificationsCreationDataFromDMOp };
