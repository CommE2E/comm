// @flow

import {
  messageTypes,
  messageDataLocalID,
  type MessageData,
  type RawMessageInfo,
} from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';
import { redisMessageTypes } from 'lib/types/redis-types';
import type { Viewer } from '../session/viewer';
import type { UpdatesForCurrentSession } from './update-creator';

import invariant from 'invariant';

import {
  rawMessageInfoFromMessageData,
  messageTypeGeneratesNotifs,
  shimUnsupportedRawMessageInfos,
  stripLocalIDs,
} from 'lib/shared/message-utils';
import { permissionLookup } from 'lib/permissions/thread-permissions';

import {
  dbQuery,
  SQL,
  appendSQLArray,
  mergeOrConditions,
} from '../database/database';
import createIDs from './id-creator';
import { sendPushNotifs } from '../push/send';
import { createUpdates } from './update-creator';
import { handleAsyncPromise } from '../responders/handlers';
import { earliestFocusedTimeConsideredCurrent } from '../shared/focused-times';
import { fetchOtherSessionsForViewer } from '../fetchers/session-fetchers';
import { publisher } from '../socket/redis';
import { fetchMessageInfoForLocalID } from '../fetchers/message-fetchers';
import { creationString } from '../utils/idempotent';

type UserThreadInfo = {|
  +devices: Map<
    string,
    {|
      +deviceType: string,
      +deviceToken: string,
      +codeVersion: ?string,
    |},
  >,
  +threadIDs: Set<string>,
  +notFocusedThreadIDs: Set<string>,
  +subthreadsCanNotify: Set<string>,
  +subthreadsCanSetToUnread: Set<string>,
|};

type LatestMessagesPerUser = Map<
  string,
  $ReadOnlyMap<
    string,
    {|
      +latestMessage: string,
      +latestReadMessage?: string,
    |},
  >,
>;

type LatestMessages = $ReadOnlyArray<{|
  +userID: string,
  +threadID: string,
  +latestMessage: string,
  +latestReadMessage: ?string,
|}>;

// Does not do permission checks! (checkThreadPermission)
async function createMessages(
  viewer: Viewer,
  messageDatas: $ReadOnlyArray<MessageData>,
  updatesForCurrentSession?: UpdatesForCurrentSession = 'return',
): Promise<RawMessageInfo[]> {
  if (messageDatas.length === 0) {
    return [];
  }

  const messageInfos: RawMessageInfo[] = [];
  const newMessageDatas: MessageData[] = [];
  const existingMessages = await Promise.all(
    messageDatas.map((messageData) =>
      fetchMessageInfoForLocalID(viewer, messageDataLocalID(messageData)),
    ),
  );
  for (let i = 0; i < existingMessages.length; i++) {
    const existingMessage = existingMessages[i];
    if (existingMessage) {
      messageInfos.push(existingMessage);
    } else {
      newMessageDatas.push(messageDatas[i]);
    }
  }
  if (newMessageDatas.length === 0) {
    return shimUnsupportedRawMessageInfos(messageInfos, viewer.platformDetails);
  }

  const ids = await createIDs('messages', newMessageDatas.length);

  const subthreadPermissionsToCheck: Set<string> = new Set();
  const threadsToMessageIndices: Map<string, number[]> = new Map();
  const messageInsertRows = [];
  for (let i = 0; i < newMessageDatas.length; i++) {
    const messageData = newMessageDatas[i];
    const threadID = messageData.threadID;
    const creatorID = messageData.creatorID;

    if (messageData.type === messageTypes.CREATE_SUB_THREAD) {
      subthreadPermissionsToCheck.add(messageData.childThreadID);
    }

    let messageIndices = threadsToMessageIndices.get(threadID);
    if (!messageIndices) {
      messageIndices = [];
      threadsToMessageIndices.set(threadID, messageIndices);
    }
    messageIndices.push(i);

    let content;
    if (messageData.type === messageTypes.CREATE_THREAD) {
      content = JSON.stringify(messageData.initialThreadState);
    } else if (messageData.type === messageTypes.CREATE_SUB_THREAD) {
      content = messageData.childThreadID;
    } else if (messageData.type === messageTypes.TEXT) {
      content = messageData.text;
    } else if (messageData.type === messageTypes.ADD_MEMBERS) {
      content = JSON.stringify(messageData.addedUserIDs);
    } else if (messageData.type === messageTypes.CHANGE_SETTINGS) {
      content = JSON.stringify({
        [messageData.field]: messageData.value,
      });
    } else if (messageData.type === messageTypes.REMOVE_MEMBERS) {
      content = JSON.stringify(messageData.removedUserIDs);
    } else if (messageData.type === messageTypes.CHANGE_ROLE) {
      content = JSON.stringify({
        userIDs: messageData.userIDs,
        newRole: messageData.newRole,
      });
    } else if (
      messageData.type === messageTypes.CREATE_ENTRY ||
      messageData.type === messageTypes.EDIT_ENTRY ||
      messageData.type === messageTypes.DELETE_ENTRY ||
      messageData.type === messageTypes.RESTORE_ENTRY
    ) {
      content = JSON.stringify({
        entryID: messageData.entryID,
        date: messageData.date,
        text: messageData.text,
      });
    } else if (
      messageData.type === messageTypes.IMAGES ||
      messageData.type === messageTypes.MULTIMEDIA
    ) {
      const mediaIDs = [];
      for (const { id } of messageData.media) {
        mediaIDs.push(parseInt(id, 10));
      }
      content = JSON.stringify(mediaIDs);
    } else if (messageData.type === messageTypes.UPDATE_RELATIONSHIP) {
      content = JSON.stringify({
        operation: messageData.operation,
        targetID: messageData.targetID,
      });
    }

    const creation =
      messageData.localID && viewer.hasSessionInfo
        ? creationString(viewer, messageData.localID)
        : null;

    messageInsertRows.push([
      ids[i],
      threadID,
      creatorID,
      messageData.type,
      content,
      messageData.time,
      creation,
    ]);
    messageInfos.push(rawMessageInfoFromMessageData(messageData, ids[i]));
  }

  handleAsyncPromise(
    postMessageSend(
      viewer,
      threadsToMessageIndices,
      subthreadPermissionsToCheck,
      stripLocalIDs(messageInfos),
      updatesForCurrentSession,
    ),
  );

  const messageInsertQuery = SQL`
    INSERT INTO messages(id, thread, user, type, content, time, creation)
    VALUES ${messageInsertRows}
  `;
  await dbQuery(messageInsertQuery);

  if (updatesForCurrentSession !== 'return') {
    return [];
  }

  return shimUnsupportedRawMessageInfos(messageInfos, viewer.platformDetails);
}

// Handles:
// (1) Sending push notifs
// (2) Setting threads to unread and generating corresponding UpdateInfos
// (3) Publishing to Redis so that active sockets pass on new messages
async function postMessageSend(
  viewer: Viewer,
  threadsToMessageIndices: Map<string, number[]>,
  subthreadPermissionsToCheck: Set<string>,
  messageInfos: RawMessageInfo[],
  updatesForCurrentSession: UpdatesForCurrentSession,
) {
  let joinIndex = 0;
  let subthreadSelects = '';
  const subthreadJoins = [];
  for (const subthread of subthreadPermissionsToCheck) {
    const index = joinIndex++;
    subthreadSelects += `
      ,
      stm${index}.permissions AS subthread${subthread}_permissions,
      stm${index}.role AS subthread${subthread}_role
    `;
    const join = SQL`LEFT JOIN memberships `;
    join.append(`stm${index} ON stm${index}.`);
    join.append(SQL`thread = ${subthread} AND `);
    join.append(`stm${index}.user = m.user`);
    subthreadJoins.push(join);
  }

  const time = earliestFocusedTimeConsideredCurrent();
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT m.user, m.thread, c.platform, c.device_token, c.versions,
      f.user AS focused_user
  `;
  query.append(subthreadSelects);
  query.append(SQL`
    FROM memberships m
    LEFT JOIN cookies c ON c.user = m.user AND c.device_token IS NOT NULL
    LEFT JOIN focused f ON f.user = m.user AND f.thread = m.thread
      AND f.time > ${time}
  `);
  appendSQLArray(query, subthreadJoins, SQL` `);
  query.append(SQL`
    WHERE (m.role > 0 OR f.user IS NOT NULL) AND
      JSON_EXTRACT(m.permissions, ${visibleExtractString}) IS TRUE AND
      m.thread IN (${[...threadsToMessageIndices.keys()]})
  `);

  const perUserInfo = new Map<string, UserThreadInfo>();
  const [result] = await dbQuery(query);
  for (const row of result) {
    const userID = row.user.toString();
    const threadID = row.thread.toString();
    const deviceToken = row.device_token;
    const focusedUser = !!row.focused_user;
    const { platform, versions } = row;
    let thisUserInfo = perUserInfo.get(userID);
    if (!thisUserInfo) {
      thisUserInfo = {
        devices: new Map(),
        threadIDs: new Set(),
        notFocusedThreadIDs: new Set(),
        subthreadsCanNotify: new Set(),
        subthreadsCanSetToUnread: new Set(),
      };
      perUserInfo.set(userID, thisUserInfo);
      // Subthread info will be the same for each subthread, so we only parse
      // it once
      for (const subthread of subthreadPermissionsToCheck) {
        const isSubthreadMember = !!row[`subthread${subthread}_role`];
        const permissions = row[`subthread${subthread}_permissions`];
        const canSeeSubthread = permissionLookup(
          permissions,
          threadPermissions.KNOW_OF,
        );
        if (!canSeeSubthread) {
          continue;
        }
        thisUserInfo.subthreadsCanSetToUnread.add(subthread);
        // Only include the notification from the superthread if there is no
        // notification from the subthread
        if (
          !isSubthreadMember ||
          !permissionLookup(permissions, threadPermissions.VISIBLE)
        ) {
          thisUserInfo.subthreadsCanNotify.add(subthread);
        }
      }
    }
    if (deviceToken) {
      thisUserInfo.devices.set(deviceToken, {
        deviceType: platform,
        deviceToken,
        codeVersion: versions ? versions.codeVersion : null,
      });
    }
    thisUserInfo.threadIDs.add(threadID);
    if (!focusedUser) {
      thisUserInfo.notFocusedThreadIDs.add(threadID);
    }
  }

  const pushInfo = {};
  const messageInfosPerUser = {};
  const latestMessagesPerUser: LatestMessagesPerUser = new Map();
  for (const pair of perUserInfo) {
    const [userID, preUserPushInfo] = pair;
    const { subthreadsCanNotify } = preUserPushInfo;
    const userPushInfo = {
      devices: [...preUserPushInfo.devices.values()],
      messageInfos: [],
    };

    for (const threadID of preUserPushInfo.notFocusedThreadIDs) {
      const messageIndices = threadsToMessageIndices.get(threadID);
      invariant(messageIndices, `indices should exist for thread ${threadID}`);
      for (const messageIndex of messageIndices) {
        const messageInfo = messageInfos[messageIndex];
        if (
          (messageInfo.type !== messageTypes.CREATE_SUB_THREAD ||
            subthreadsCanNotify.has(messageInfo.childThreadID)) &&
          messageTypeGeneratesNotifs(messageInfo.type) &&
          messageInfo.creatorID !== userID
        ) {
          userPushInfo.messageInfos.push(messageInfo);
        }
      }
    }
    if (
      userPushInfo.devices.length > 0 &&
      userPushInfo.messageInfos.length > 0
    ) {
      pushInfo[userID] = userPushInfo;
    }
    const userMessageInfos = [];
    for (const threadID of preUserPushInfo.threadIDs) {
      const messageIndices = threadsToMessageIndices.get(threadID);
      invariant(messageIndices, `indices should exist for thread ${threadID}`);
      for (const messageIndex of messageIndices) {
        const messageInfo = messageInfos[messageIndex];
        userMessageInfos.push(messageInfo);
      }
    }
    if (userMessageInfos.length > 0) {
      messageInfosPerUser[userID] = userMessageInfos;
    }

    latestMessagesPerUser.set(
      userID,
      determineLatestMessagesPerThread(
        preUserPushInfo,
        userID,
        threadsToMessageIndices,
        messageInfos,
      ),
    );
  }

  const latestMessages = flattenLatestMessagesPerUser(latestMessagesPerUser);

  await Promise.all([
    createReadStatusUpdates(latestMessages),
    redisPublish(viewer, messageInfosPerUser, updatesForCurrentSession),
    updateLatestMessages(latestMessages),
  ]);

  await sendPushNotifs(pushInfo);
}

async function redisPublish(
  viewer: Viewer,
  messageInfosPerUser: { [userID: string]: $ReadOnlyArray<RawMessageInfo> },
  updatesForCurrentSession: UpdatesForCurrentSession,
) {
  const avoidBroadcastingToCurrentSession =
    viewer.hasSessionInfo && updatesForCurrentSession !== 'broadcast';
  for (const userID in messageInfosPerUser) {
    if (userID === viewer.userID && avoidBroadcastingToCurrentSession) {
      continue;
    }
    const messageInfos = messageInfosPerUser[userID];
    publisher.sendMessage(
      { userID },
      {
        type: redisMessageTypes.NEW_MESSAGES,
        messages: messageInfos,
      },
    );
  }
  const viewerMessageInfos = messageInfosPerUser[viewer.userID];
  if (!viewerMessageInfos || !avoidBroadcastingToCurrentSession) {
    return;
  }
  const sessionIDs = await fetchOtherSessionsForViewer(viewer);
  for (const sessionID of sessionIDs) {
    publisher.sendMessage(
      { userID: viewer.userID, sessionID },
      {
        type: redisMessageTypes.NEW_MESSAGES,
        messages: viewerMessageInfos,
      },
    );
  }
}

function determineLatestMessagesPerThread(
  preUserPushInfo: UserThreadInfo,
  userID: string,
  threadsToMessageIndices: $ReadOnlyMap<string, $ReadOnlyArray<number>>,
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
) {
  const {
    threadIDs,
    notFocusedThreadIDs,
    subthreadsCanSetToUnread,
  } = preUserPushInfo;
  const latestMessagesPerThread = new Map();
  for (const threadID of threadIDs) {
    const messageIndices = threadsToMessageIndices.get(threadID);
    invariant(messageIndices, `indices should exist for thread ${threadID}`);
    for (const messageIndex of messageIndices) {
      const messageInfo = messageInfos[messageIndex];
      if (
        messageInfo.type === messageTypes.CREATE_SUB_THREAD &&
        !subthreadsCanSetToUnread.has(messageInfo.childThreadID)
      ) {
        continue;
      }

      const messageID = messageInfo.id;
      invariant(
        messageID,
        'message ID should exist in determineLatestMessagesPerThread',
      );

      if (
        notFocusedThreadIDs.has(threadID) &&
        messageInfo.creatorID !== userID
      ) {
        latestMessagesPerThread.set(threadID, {
          latestMessage: messageID,
        });
      } else {
        latestMessagesPerThread.set(threadID, {
          latestMessage: messageID,
          latestReadMessage: messageID,
        });
      }
    }
  }
  return latestMessagesPerThread;
}

function flattenLatestMessagesPerUser(
  latestMessagesPerUser: LatestMessagesPerUser,
): LatestMessages {
  const result = [];
  for (const [userID, latestMessagesPerThread] of latestMessagesPerUser) {
    for (const [threadID, latestMessages] of latestMessagesPerThread) {
      result.push({
        userID,
        threadID,
        latestMessage: latestMessages.latestMessage,
        latestReadMessage: latestMessages.latestReadMessage,
      });
    }
  }
  return result;
}

async function createReadStatusUpdates(latestMessages: LatestMessages) {
  const now = Date.now();
  const readStatusUpdates = latestMessages
    .filter((message) => !message.latestReadMessage)
    .map(({ userID, threadID }) => ({
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      userID,
      time: now,
      threadID,
      unread: true,
    }));

  if (readStatusUpdates.length === 0) {
    return;
  }

  return await createUpdates(readStatusUpdates);
}

function updateLatestMessages(latestMessages: LatestMessages) {
  if (latestMessages.length === 0) {
    return;
  }

  const query = SQL`
    UPDATE memberships
    SET 
  `;

  const lastMessageExpression = SQL`
    last_message = GREATEST(last_message, CASE 
  `;
  const lastReadMessageExpression = SQL`
    , last_read_message = GREATEST(last_read_message, CASE 
  `;
  let shouldUpdateLastReadMessage = false;
  for (const {
    userID,
    threadID,
    latestMessage,
    latestReadMessage,
  } of latestMessages) {
    lastMessageExpression.append(SQL`
      WHEN user = ${userID} AND thread = ${threadID} THEN ${latestMessage}
    `);
    if (latestReadMessage) {
      shouldUpdateLastReadMessage = true;
      lastReadMessageExpression.append(SQL`
        WHEN user = ${userID} AND thread = ${threadID} THEN ${latestReadMessage}
      `);
    }
  }
  lastMessageExpression.append(SQL`
    ELSE last_message
    END)
  `);
  lastReadMessageExpression.append(SQL`
    ELSE last_read_message
    END)
  `);

  const conditions = latestMessages.map(
    ({ userID, threadID }) => SQL`(user = ${userID} AND thread = ${threadID})`,
  );

  query.append(lastMessageExpression);
  if (shouldUpdateLastReadMessage) {
    query.append(lastReadMessageExpression);
  }
  query.append(SQL`WHERE `);
  query.append(mergeOrConditions(conditions));

  return dbQuery(query);
}

export default createMessages;
