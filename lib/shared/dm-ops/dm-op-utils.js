// @flow

import uuid from 'uuid';

import type { DMOperation } from '../../types/dm-ops.js';
import type { InboundActionMetadata } from '../../types/redux-types.js';
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

export const dmOperationSpecificationTypes = Object.freeze({
  OUTBOUND: 'OutboundDMOperationSpecification',
  INBOUND: 'InboundDMOperationSpecification',
});

// The operation generated on the sending client, causes changes to
// the state and broadcasting information to peers.
export type OutboundDMOperationSpecification = {
  +type: 'OutboundDMOperationSpecification',
  +op: DMOperation,
  +supportsAutoRetry: boolean,
  +recipients:
    | { +type: 'all_peer_devices' | 'self_devices' }
    | { +type: 'some_users', +userIDs: $ReadOnlyArray<string> },
};

// The operation received from other peers, causes changes to
// the state and after processing, sends confirmation to the sender.
export type InboundDMOperationSpecification = {
  +type: 'InboundDMOperationSpecification',
  +op: DMOperation,
  +metadata: ?InboundActionMetadata,
};

export type DMOperationSpecification =
  | OutboundDMOperationSpecification
  | InboundDMOperationSpecification;

async function createMessagesToPeersFromDMOp(
  operation: OutboundDMOperationSpecification,
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

export { createMessagesToPeersFromDMOp };
