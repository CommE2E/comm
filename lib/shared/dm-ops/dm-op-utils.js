// @flow

import uuid from 'uuid';

import type { AuxUserStore } from '../../types/aux-user-types.js';
import type { DMOperation } from '../../types/dm-ops.js';
import {
  outboundP2PMessageStatuses,
  type OutboundP2PMessage,
} from '../../types/sqlite-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';
import { getContentSigningKey } from '../../utils/crypto-utils.js';
import { values } from '../../utils/objects.js';

function generateMessagesToPeers(
  message: DMOperation,
  peers: $ReadOnlyArray<string>,
  userID: string,
  supportsAutoRetry: boolean,
): $ReadOnlyArray<OutboundP2PMessage> {
  const outboundP2PMessages = [];
  for (const peerID of peers) {
    const messageToPeer: OutboundP2PMessage = {
      messageID: uuid.v4(),
      deviceID: peerID,
      userID,
      timestamp: new Date().getTime().toString(),
      plaintext: JSON.stringify(message),
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
  auxUserStore: AuxUserStore,
  currentUserInfo: ?CurrentUserInfo,
): Promise<$ReadOnlyArray<OutboundP2PMessage>> {
  if (!currentUserInfo?.id) {
    return [];
  }
  const selfDevices =
    auxUserStore.auxUserInfos[currentUserInfo.id].deviceList?.devices ?? [];
  const allPeerDevices = values(auxUserStore.auxUserInfos)
    .map(info => info.deviceList?.devices ?? [])
    .flat();
  const devices =
    operation.recipients === 'all_peer_devices' ? allPeerDevices : selfDevices;
  const thisDeviceID = await getContentSigningKey();
  const targetDevices = devices.filter(id => id !== thisDeviceID);
  return generateMessagesToPeers(
    operation.op,
    targetDevices,
    currentUserInfo.id,
    operation.supportsAutoRetry,
  );
}

export { createMessagesToPeersFromDMOp };
