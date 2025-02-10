// @flow

import invariant from 'invariant';
import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import uuid from 'uuid';

import { type ProcessDMOperationUtilities } from './dm-op-spec.js';
import { dmOpSpecs } from './dm-op-specs.js';
import { useProcessAndSendDMOperation } from './process-dm-ops.js';
import {
  setMissingDeviceListsActionType,
  removePeerUsersActionType,
} from '../../actions/aux-user-actions.js';
import { useFindUserIdentities } from '../../actions/find-user-identities-actions.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useGetAndUpdateDeviceListsForUsers } from '../../hooks/peer-list-hooks.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import { thickRawThreadInfosSelector } from '../../selectors/thread-selectors.js';
import { getAllPeerUserIDAndDeviceIDs } from '../../selectors/user-selectors.js';
import { type P2PMessageRecipient } from '../../tunnelbroker/peer-to-peer-context.js';
import type {
  CreateThickRawThreadInfoInput,
  DMAddMembersOperation,
  DMAddViewerToThreadMembersOperation,
  DMOperation,
  ComposableDMOperation,
} from '../../types/dm-ops.js';
import type { RawMessageInfo } from '../../types/message-types.js';
import type {
  ThickRawThreadInfo,
  ThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
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
import { updateTypes } from '../../types/update-types-enum.js';
import type {
  AccountDeletionUpdateInfo,
  ClientUpdateInfo,
} from '../../types/update-types.js';
import { getContentSigningKey } from '../../utils/crypto-utils.js';
import { useSelector, useDispatch } from '../../utils/redux-utils.js';
import {
  type MessageNotifyType,
  messageNotifyTypes,
} from '../messages/message-spec.js';
import { messageSpecs } from '../messages/message-specs.js';
import {
  expectedAccountDeletionUpdateTimeout,
  userHasDeviceList,
  deviceListCanBeRequestedForUser,
} from '../thread-utils.js';

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

type OutboundDMOperationSpecificationRecipients =
  | { +type: 'all_peer_devices' | 'self_devices' }
  | { +type: 'some_users', +userIDs: $ReadOnlyArray<string> }
  | { +type: 'all_thread_members', +threadID: string }
  | { +type: 'some_devices', +deviceIDs: $ReadOnlyArray<string> };

// The operation generated on the sending client, causes changes to
// the state and broadcasting information to peers.
export type OutboundDMOperationSpecification = {
  +type: 'OutboundDMOperationSpecification',
  +op: DMOperation,
  +recipients: OutboundDMOperationSpecificationRecipients,
  +sendOnly?: boolean,
};

export type OutboundComposableDMOperationSpecification = {
  +type: 'OutboundDMOperationSpecification',
  +op: ComposableDMOperation,
  +recipients: OutboundDMOperationSpecificationRecipients,
  // Composable DM Ops are created only to be sent, locally we use
  // dedicated mechanism for updating the store.
  +sendOnly: true,
  +composableMessageID: string,
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

function useCreateMessagesToPeersFromDMOp(): (
  operation: DMOperation,
  recipients: OutboundDMOperationSpecificationRecipients,
) => Promise<$ReadOnlyArray<OutboundP2PMessage>> {
  const allPeerUserIDAndDeviceIDs = useSelector(getAllPeerUserIDAndDeviceIDs);
  const utilities = useSendDMOperationUtils();
  const auxUserInfos = useSelector(state => state.auxUserStore.auxUserInfos);
  const getAndUpdateDeviceListsForUsers = useGetAndUpdateDeviceListsForUsers();
  const dispatch = useDispatch();

  const getUsersWithoutDeviceList = React.useCallback(
    (userIDs: $ReadOnlyArray<string>) => {
      const missingDeviceListsUserIDs: Array<string> = [];
      for (const userID of userIDs) {
        const supportsThickThreads = userHasDeviceList(userID, auxUserInfos);
        const deviceListCanBeRequested = deviceListCanBeRequestedForUser(
          userID,
          auxUserInfos,
        );
        if (!supportsThickThreads && deviceListCanBeRequested) {
          missingDeviceListsUserIDs.push(userID);
        }
      }
      return missingDeviceListsUserIDs;
    },
    [auxUserInfos],
  );

  const getMissingPeers = React.useCallback(
    async (
      userIDs: $ReadOnlyArray<string>,
    ): Promise<$ReadOnlyArray<P2PMessageRecipient>> => {
      const missingDeviceListsUserIDs = getUsersWithoutDeviceList(userIDs);
      if (missingDeviceListsUserIDs.length === 0) {
        return [];
      }

      const deviceLists = await getAndUpdateDeviceListsForUsers(
        missingDeviceListsUserIDs,
        true,
      );

      if (!deviceLists) {
        return [];
      }

      const missingUsers: $ReadOnlyArray<string> =
        missingDeviceListsUserIDs.filter(id => !deviceLists[id]);
      const time = Date.now();
      const shouldDeleteUser = (userID: string) =>
        !!auxUserInfos[userID]?.accountMissingStatus &&
        auxUserInfos[userID].accountMissingStatus.missingSince <
          time - expectedAccountDeletionUpdateTimeout;

      const nonDeletedUsers = missingUsers.filter(
        userID => !shouldDeleteUser(userID),
      );
      if (nonDeletedUsers.length > 0) {
        dispatch({
          type: setMissingDeviceListsActionType,
          payload: {
            usersMissingFromIdentity: {
              userIDs: nonDeletedUsers,
              time,
            },
          },
        });
      }

      const deletedUsers = missingUsers.filter(shouldDeleteUser);
      if (deletedUsers.length > 0) {
        const deleteUserUpdates: $ReadOnlyArray<AccountDeletionUpdateInfo> =
          deletedUsers.map(deletedUserID => ({
            type: updateTypes.DELETE_ACCOUNT,
            time,
            id: uuid.v4(),
            deletedUserID,
          }));
        dispatch({
          type: removePeerUsersActionType,
          payload: { updatesResult: { newUpdates: deleteUserUpdates } },
        });
      }

      const updatedPeers: Array<P2PMessageRecipient> = [];
      for (const userID of missingDeviceListsUserIDs) {
        if (deviceLists[userID] && deviceLists[userID].devices.length > 0) {
          updatedPeers.push(
            ...deviceLists[userID].devices.map(deviceID => ({
              deviceID,
              userID,
            })),
          );
        }
      }
      return updatedPeers;
    },
    [
      auxUserInfos,
      dispatch,
      getAndUpdateDeviceListsForUsers,
      getUsersWithoutDeviceList,
    ],
  );

  return React.useCallback(
    async (
      operation: DMOperation,
      recipients: OutboundDMOperationSpecificationRecipients,
    ): Promise<$ReadOnlyArray<OutboundP2PMessage>> => {
      const { viewerID, threadInfos } = utilities;
      if (!viewerID) {
        return [];
      }

      let peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs;
      if (recipients.type === 'self_devices') {
        peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs.filter(
          peer => peer.userID === viewerID,
        );
      } else if (recipients.type === 'some_users') {
        const missingPeers = await getMissingPeers(recipients.userIDs);
        const updatedPeers = [...allPeerUserIDAndDeviceIDs, ...missingPeers];

        const userIDs = new Set(recipients.userIDs);
        peerUserIDAndDeviceIDs = updatedPeers.filter(peer =>
          userIDs.has(peer.userID),
        );
      } else if (recipients.type === 'all_thread_members') {
        const { threadID } = recipients;
        if (!threadInfos[threadID]) {
          console.log(
            `all_thread_members called for threadID ${threadID}, which is ` +
              'missing from the ThreadStore. if sending a message soon after ' +
              'thread creation, consider some_users instead',
          );
        }
        const members = threadInfos[recipients.threadID]?.members ?? [];
        const memberIDs = members.map(member => member.id);

        const missingPeers = await getMissingPeers(memberIDs);
        const updatedPeers = [...allPeerUserIDAndDeviceIDs, ...missingPeers];

        const userIDs = new Set(memberIDs);
        peerUserIDAndDeviceIDs = updatedPeers.filter(peer =>
          userIDs.has(peer.userID),
        );
      } else if (recipients.type === 'some_devices') {
        const deviceIDs = new Set(recipients.deviceIDs);
        peerUserIDAndDeviceIDs = allPeerUserIDAndDeviceIDs.filter(peer =>
          deviceIDs.has(peer.deviceID),
        );
      }

      const thisDeviceID = await getContentSigningKey();
      const targetPeers = peerUserIDAndDeviceIDs.filter(
        peer => peer.deviceID !== thisDeviceID,
      );
      return generateMessagesToPeers(operation, targetPeers);
    },
    [allPeerUserIDAndDeviceIDs, getMissingPeers, utilities],
  );
}

function getCreateThickRawThreadInfoInputFromThreadInfo(
  threadInfo: ThickRawThreadInfo,
): CreateThickRawThreadInfoInput {
  const roleID = Object.keys(threadInfo.roles).pop();
  const thickThreadType = assertThickThreadType(threadInfo.type);
  return {
    threadID: threadInfo.id,
    threadType: thickThreadType,
    creationTime: threadInfo.creationTime,
    parentThreadID: threadInfo.parentThreadID,
    allMemberIDsWithSubscriptions: threadInfo.members.map(
      ({ id, subscription }) => ({
        id,
        subscription,
      }),
    ),
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
    timestamps: threadInfo.timestamps,
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
      const rawThreadInfo = threadInfos[threadInfo.id];
      invariant(rawThreadInfo.thick, 'thread should be thick');
      const existingThreadDetails =
        getCreateThickRawThreadInfoInputFromThreadInfo(rawThreadInfo);

      const messageID = uuid.v4();

      invariant(viewerID, 'viewerID should be set');
      const addViewerToThreadMembersOperation: DMAddViewerToThreadMembersOperation =
        {
          type: 'add_viewer_to_thread_members',
          existingThreadDetails,
          editorID: viewerID,
          time: Date.now(),
          messageID,
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
        messageID,
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

type GetThreadUpdatesForNewMessagesInputType = {
  +rawMessageInfos: $ReadOnlyArray<RawMessageInfo>,
  +updateInfos: $ReadOnlyArray<ClientUpdateInfo>,
  +threadInfos: RawThreadInfos,
  +messagesNotifyTypes: { +[messageID: string]: MessageNotifyType },
  +viewerID: ?string,
};
function getThreadUpdatesForNewMessages(
  input: GetThreadUpdatesForNewMessagesInputType,
): Array<ClientUpdateInfo> {
  const {
    rawMessageInfos,
    updateInfos,
    threadInfos,
    messagesNotifyTypes,
    viewerID,
  } = input;

  if (!viewerID) {
    return [];
  }

  const { rawMessageInfos: allNewMessageInfos } = mergeUpdatesWithMessageInfos(
    rawMessageInfos,
    updateInfos,
  );
  const messagesByThreadID = _groupBy(message => message.threadID)(
    allNewMessageInfos,
  );

  const newUpdateInfos: Array<ClientUpdateInfo> = [];
  for (const threadID in messagesByThreadID) {
    const repliesCountIncreasingMessages = messagesByThreadID[threadID].filter(
      message => messageSpecs[message.type].includedInRepliesCount,
    );

    let threadInfo = threadInfos[threadID];

    if (repliesCountIncreasingMessages.length > 0) {
      const repliesCountIncreaseTime = Math.max(
        repliesCountIncreasingMessages.map(message => message.time),
      );
      const oldRepliesCount = threadInfo?.repliesCount ?? 0;
      const newThreadInfo = {
        ...threadInfo,
        repliesCount: oldRepliesCount + repliesCountIncreasingMessages.length,
      };
      newUpdateInfos.push({
        type: updateTypes.UPDATE_THREAD,
        id: uuid.v4(),
        time: repliesCountIncreaseTime,
        threadInfo: newThreadInfo,
      });
      threadInfo = newThreadInfo;
    }

    const messagesAffectingUnreadStatus = messagesByThreadID[threadID].filter(
      message => {
        const { id } = message;
        invariant(id, 'Thick thread RawMessageInfos should always have ID');
        const messageNotifyType = messagesNotifyTypes[id];
        return (
          message.creatorID !== viewerID &&
          (messageNotifyType === messageNotifyTypes.SET_UNREAD ||
            messageNotifyType === messageNotifyTypes.NOTIF_AND_SET_UNREAD)
        );
      },
    );
    if (messagesAffectingUnreadStatus.length === 0) {
      continue;
    }
    // We take the most recent timestamp to make sure that
    // change_thread_read_status operation older
    // than it won't flip the status to read.
    const time = Math.max(
      messagesAffectingUnreadStatus.map(message => message.time),
    );
    invariant(threadInfo.thick, 'Thread should be thick');

    if (threadInfo.timestamps.currentUser.unread < time) {
      newUpdateInfos.push({
        type: updateTypes.UPDATE_THREAD_READ_STATUS,
        id: uuid.v4(),
        time,
        threadID: threadInfo.id,
        unread: true,
      });
    }
  }

  return newUpdateInfos;
}

function useSendDMOperationUtils(): $ReadOnly<{
  ...ProcessDMOperationUtilities,
  viewerID: ?string,
}> {
  const fetchMessage = useGetLatestMessageEdit();
  const threadInfos = useSelector(thickRawThreadInfosSelector);
  const entryInfos = useSelector(state => state.entryStore.entryInfos);
  const findUserIdentities = useFindUserIdentities();
  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  return React.useMemo(
    () => ({
      viewerID,
      fetchMessage,
      threadInfos,
      entryInfos,
      findUserIdentities,
    }),
    [viewerID, fetchMessage, threadInfos, entryInfos, findUserIdentities],
  );
}

export {
  useCreateMessagesToPeersFromDMOp,
  useAddDMThreadMembers,
  getCreateThickRawThreadInfoInputFromThreadInfo,
  getThreadUpdatesForNewMessages,
  useSendDMOperationUtils,
};
