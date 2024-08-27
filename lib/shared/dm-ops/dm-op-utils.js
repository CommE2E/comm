// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { dmOpSpecs } from './dm-op-specs.js';
import { useProcessAndSendDMOperation } from './process-dm-ops.js';
import type {
  CreateThickRawThreadInfoInput,
  DMAddMembersOperation,
  DMAddViewerToThreadMembersOperation,
  DMOperation,
} from '../../types/dm-ops.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { InboundActionMetadata } from '../../types/redux-types.js';
import {
  outboundP2PMessageStatuses,
  type OutboundP2PMessage,
} from '../../types/sqlite-types.js';
import {
  assertThickThreadType,
  thickThreadTypes,
} from '../../types/thread-types-enum.js';
import type { RawThreadInfos } from '../../types/thread-types.js';
import {
  type DMOperationP2PMessage,
  userActionsP2PMessageTypes,
} from '../../types/tunnelbroker/user-actions-peer-to-peer-message-types.js';
import type { CurrentUserInfo } from '../../types/user-types.js';
import { getContentSigningKey } from '../../utils/crypto-utils.js';
import { useSelector } from '../../utils/redux-utils.js';

function generateMessagesToPeers(
  message: DMOperation,
  peers: $ReadOnlyArray<{
    +userID: string,
    +deviceID: string,
  }>,
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
      supportsAutoRetry: dmOpSpecs[message.type].supportsAutoRetry,
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
  +recipients:
    | { +type: 'all_peer_devices' | 'self_devices' }
    | { +type: 'some_users', +userIDs: $ReadOnlyArray<string> }
    | { +type: 'all_thread_members', +threadID: string },
  +sendOnly?: boolean,
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
  threadInfos: RawThreadInfos,
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
  } else if (operation.recipients.type === 'all_thread_members') {
    const members = threadInfos[operation.recipients.threadID]?.members ?? [];
    const memberIDs = members.map(member => member.id);

    const userIDs = new Set(memberIDs);
    peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs.filter(peer =>
      userIDs.has(peer.userID),
    );
  }

  const thisDeviceID = await getContentSigningKey();
  const targetPeers = peerUserIDAndDeviceIDs.filter(
    peer => peer.deviceID !== thisDeviceID,
  );
  return generateMessagesToPeers(operation.op, targetPeers);
}

function getCreateThickRawThreadInfoInputFromThreadInfo(
  threadInfo: ThreadInfo,
): CreateThickRawThreadInfoInput {
  const roleID = Object.keys(threadInfo.roles).pop();
  const thickThreadType = assertThickThreadType(threadInfo.type);
  return {
    threadID: threadInfo.id,
    threadType: thickThreadType,
    creationTime: threadInfo.creationTime,
    parentThreadID: threadInfo.parentThreadID,
    allMemberIDs: threadInfo.members.map(member => member.id),
    roleID,
    unread: !!threadInfo.currentUser.unread,
    name: threadInfo.name,
    avatar: threadInfo.avatar,
    description: threadInfo.description,
    color: threadInfo.color,
    containingThreadID: threadInfo.containingThreadID,
    sourceMessageID: threadInfo.sourceMessageID,
    repliesCount: threadInfo.repliesCount,
    pinnedCount: threadInfo.pinnedCount,
  };
}

function useAddDMThreadMembers(): (
  newMemberIDs: $ReadOnlyArray<string>,
  threadInfo: ThreadInfo,
) => Promise<void> {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  return React.useCallback(
    async (newMemberIDs: $ReadOnlyArray<string>, threadInfo: ThreadInfo) => {
      const existingThreadDetails =
        getCreateThickRawThreadInfoInputFromThreadInfo(threadInfo);

      invariant(viewerID, 'viewerID should be set');
      const addViewerToThreadMembersOperation: DMAddViewerToThreadMembersOperation =
        {
          type: 'add_viewer_to_thread_members',
          existingThreadDetails,
          editorID: viewerID,
          time: Date.now(),
          messageID: uuid.v4(),
          addedUserIDs: newMemberIDs,
        };
      const viewerOperationSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op: addViewerToThreadMembersOperation,
        recipients: {
          type: 'some_users',
          userIDs: newMemberIDs,
        },
        sendOnly: true,
      };

      invariant(viewerID, 'viewerID should be set');
      const addMembersOperation: DMAddMembersOperation = {
        type: 'add_members',
        threadID: threadInfo.id,
        editorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        addedUserIDs: newMemberIDs,
      };
      const newMemberIDsSet = new Set<string>(newMemberIDs);
      const recipientsThreadID =
        threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
        threadInfo.parentThreadID
          ? threadInfo.parentThreadID
          : threadInfo.id;

      const existingMembers =
        threadInfos[recipientsThreadID]?.members
          ?.map(member => member.id)
          ?.filter(memberID => !newMemberIDsSet.has(memberID)) ?? [];

      const addMembersOperationSpecification: OutboundDMOperationSpecification =
        {
          type: dmOperationSpecificationTypes.OUTBOUND,
          op: addMembersOperation,
          recipients: {
            type: 'some_users',
            userIDs: existingMembers,
          },
        };

      await Promise.all([
        processAndSendDMOperation(viewerOperationSpecification),
        processAndSendDMOperation(addMembersOperationSpecification),
      ]);
    },
    [processAndSendDMOperation, threadInfos, viewerID],
  );
}

export { createMessagesToPeersFromDMOp, useAddDMThreadMembers };
