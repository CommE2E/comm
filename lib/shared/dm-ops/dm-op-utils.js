// @flow

import type { DMOperationSpecification } from './dm-op-spec.js';
import { dmOpSpecs } from './dm-op-specs.js';
import type { AuxUserStore } from '../../types/aux-user-types.js';
import type { DMOperation } from '../../types/dm-ops.js';
import type { BaseAction } from '../../types/redux-types.js';
import type { OutboundP2PMessage } from '../../types/sqlite-types.js';
import { outboundP2PMessageStatuses } from '../../types/sqlite-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';
import { values } from '../../utils/objects.js';
import { getUUID } from '../../utils/uuid.js';

function generateMessagesToPeers(
  message: DMOperation,
  peers: $ReadOnlyArray<string>,
  userID: string,
  supportsAutoRetry: boolean,
): $ReadOnlyArray<OutboundP2PMessage> {
  const outboundP2PMessages = [];
  for (const peerID of peers) {
    const messageToPeer: OutboundP2PMessage = {
      messageID: getUUID(),
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

function createOpsFromAction(
  action: BaseAction,
): $ReadOnlyArray<DMOperationSpecification<DMOperation>> {
  const result = [];
  for (const spec of values(dmOpSpecs)) {
    const op = spec.fromAction(action);
    if (op) {
      result.push(op);
    }
  }
  return result;
}

function createMessagesToPeersFromAction(
  action: BaseAction,
  auxUserStore: AuxUserStore,
  currentUserInfo: ?CurrentUserInfo,
): $ReadOnlyArray<OutboundP2PMessage> {
  if (!currentUserInfo?.id) {
    return [];
  }
  const ops = createOpsFromAction(action);
  if (ops.length === 0) {
    return [];
  }
  const selfDevices =
    auxUserStore.auxUserInfos[currentUserInfo.id].deviceList?.devices ?? [];
  const allPeerDevices = values(auxUserStore.auxUserInfos)
    .map(info => info.deviceList?.devices ?? [])
    .flat();
  const result: Array<OutboundP2PMessage> = [];
  for (const op of ops) {
    result.push(
      ...generateMessagesToPeers(
        op.op,
        op.recipients === 'all_peer_devices' ? allPeerDevices : selfDevices,
        currentUserInfo.id,
        op.supportsAutoRetry,
      ),
    );
  }
  return result;
}

export { createMessagesToPeersFromAction };
