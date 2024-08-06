// @flow

import uuid from 'uuid';

import type { DMOperation } from '../../types/dm-ops.js';
import { messageTypes } from '../../types/message-types-enum.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type { RawThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import {
  outboundP2PMessageStatuses,
  type OutboundP2PMessage,
} from '../../types/sqlite-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import type { LegacyRawThreadInfo } from '../../types/thread-types.js';
import {
  type DMOperationP2PMessage,
  userActionsP2PMessageTypes,
} from '../../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import { updateTypes } from '../../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';
import { getContentSigningKey } from '../../utils/crypto-utils.js';
import { messageSpecs } from '../messages/message-specs.js';

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
  +recipients: 'all_peer_devices' | 'self_devices',
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
  if (operation.recipients === 'self_devices') {
    peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs.filter(
      peer => peer.userID === currentUserInfo.id,
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

function createRepliesCountUpdate(
  threadInfo: RawThreadInfo | LegacyRawThreadInfo,
  newMessages: $ReadOnlyArray<RawMessageInfo>,
): ?ClientUpdateInfo {
  if (threadInfo.type !== threadTypes.THICK_SIDEBAR) {
    return null;
  }
  const includedMessageTypes = new Set(
    Object.keys(messageTypes)
      .map(key => messageTypes[key])
      .filter(type => messageSpecs[type].includedInRepliesCount),
  );
  const filteredMessages = newMessages.filter(message =>
    includedMessageTypes.has(message.type),
  );
  const countIncrease = filteredMessages.length;
  if (countIncrease === 0) {
    return null;
  }
  const time = Math.max(...filteredMessages.map(message => message.time));
  return {
    type: updateTypes.UPDATE_THREAD,
    id: uuid.v4(),
    time,
    threadInfo: {
      ...threadInfo,
      repliesCount: threadInfo.repliesCount + countIncrease,
    },
  };
}

export { createMessagesToPeersFromDMOp, createRepliesCountUpdate };
