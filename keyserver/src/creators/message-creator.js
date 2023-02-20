// @flow

import invariant from 'invariant';
import _pickBy from 'lodash/fp/pickBy.js';

import { permissionLookup } from 'lib/permissions/thread-permissions.js';
import {
  rawMessageInfoFromMessageData,
  shimUnsupportedRawMessageInfos,
  stripLocalIDs,
} from 'lib/shared/message-utils.js';
import { pushTypes } from 'lib/shared/messages/message-spec.js';
import { messageSpecs } from 'lib/shared/messages/message-specs.js';
import {
  messageTypes,
  messageDataLocalID,
  type MessageData,
  type RawMessageInfo,
} from 'lib/types/message-types.js';
import { redisMessageTypes } from 'lib/types/redis-types.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import { promiseAll } from 'lib/utils/promises.js';

import createIDs from './id-creator.js';
import type { UpdatesForCurrentSession } from './update-creator.js';
import { createUpdates } from './update-creator.js';
import {
  dbQuery,
  SQL,
  appendSQLArray,
  mergeOrConditions,
} from '../database/database.js';
import {
  fetchMessageInfoForLocalID,
  fetchMessageInfoByID,
} from '../fetchers/message-fetchers.js';
import { fetchOtherSessionsForViewer } from '../fetchers/session-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { sendPushNotifs } from '../push/send.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import type { Viewer } from '../session/viewer.js';
import { earliestFocusedTimeConsideredExpired } from '../shared/focused-times.js';
import { publisher } from '../socket/redis.js';
import { creationString } from '../utils/idempotent.js';

type UserThreadInfo = {
  +devices: Map<
    string,
    {
      +deviceType: string,
      +deviceToken: string,
      +codeVersion: ?string,
    },
  >,
  +threadIDs: Set<string>,
  +notFocusedThreadIDs: Set<string>,
  +userNotMemberOfSubthreads: Set<string>,
  +subthreadsCanSetToUnread: Set<string>,
};

type LatestMessagesPerUser = Map<
  string,
  $ReadOnlyMap<
    string,
    {
      +latestMessage: string,
      +latestReadMessage?: string,
    },
  >,
>;

type LatestMessages = $ReadOnlyArray<{
  +userID: string,
  +threadID: string,
  +latestMessage: string,
  +latestReadMessage: ?string,
}>;

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
    messageDatas.map(messageData =>
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

    const content =
      messageSpecs[messageData.type].messageContentForServerDB?.(messageData);

    const creation =
      messageData.localID && viewer.hasSessionInfo
        ? creationString(viewer, messageData.localID)
        : null;

    const targetMessageID = messageData.targetMessageID
      ? messageData.targetMessageID
      : null;

    messageInsertRows.push([
      ids[i],
      threadID,
      creatorID,
      messageData.type,
      content,
      messageData.time,
      creation,
      targetMessageID,
    ]);
    messageInfos.push(rawMessageInfoFromMessageData(messageData, ids[i]));
  }

  if (viewer.isScriptViewer) {
    await postMessageSend(
      viewer,
      threadsToMessageIndices,
      subthreadPermissionsToCheck,
      stripLocalIDs(messageInfos),
      updatesForCurrentSession,
    );
  } else {
    // We aren't awaiting because this function calls external services and we
    // don't want to delay the response
    handleAsyncPromise(
      postMessageSend(
        viewer,
        threadsToMessageIndices,
        subthreadPermissionsToCheck,
        stripLocalIDs(messageInfos),
        updatesForCurrentSession,
      ),
    );
  }

  const messageInsertQuery = SQL`
    INSERT INTO messages(id, thread, user, type, content, time,
      creation, target_message)
    VALUES ${messageInsertRows}
  `;
  await Promise.all([
    dbQuery(messageInsertQuery),
    updateRepliesCount(threadsToMessageIndices, newMessageDatas),
  ]);

  if (updatesForCurrentSession !== 'return') {
    return [];
  }

  return shimUnsupportedRawMessageInfos(messageInfos, viewer.platformDetails);
}

async function updateRepliesCount(
  threadsToMessageIndices: Map<string, number[]>,
  newMessageDatas: MessageData[],
) {
  const updatedThreads = [];

  const updateThreads = SQL`
    UPDATE threads
    SET replies_count = replies_count + (CASE `;

  const membershipConditions = [];
  for (const [threadID, messages] of threadsToMessageIndices.entries()) {
    const newRepliesIncrease = messages
      .map(i => newMessageDatas[i].type)
      .filter(type => messageSpecs[type].includedInRepliesCount).length;
    if (newRepliesIncrease === 0) {
      continue;
    }

    updateThreads.append(SQL`
      WHEN id = ${threadID} THEN ${newRepliesIncrease}
    `);
    updatedThreads.push(threadID);

    const senders = messages.map(i => newMessageDatas[i].creatorID);
    membershipConditions.push(
      SQL`thread = ${threadID} AND user IN (${senders})`,
    );
  }
  updateThreads.append(SQL`
      ELSE 0
      END)
    WHERE id IN (${updatedThreads})
      AND source_message IS NOT NULL
  `);

  const updateMemberships = SQL`
    UPDATE memberships
    SET sender = 1
    WHERE sender = 0 
      AND (
  `;
  updateMemberships.append(mergeOrConditions(membershipConditions));
  updateMemberships.append(SQL`
      )
  `);

  if (updatedThreads.length > 0) {
    const [{ threadInfos: serverThreadInfos }] = await Promise.all([
      fetchServerThreadInfos(SQL`t.id IN (${updatedThreads})`),
      dbQuery(updateThreads),
      dbQuery(updateMemberships),
    ]);

    const time = Date.now();
    const updates = [];
    for (const threadID in serverThreadInfos) {
      for (const member of serverThreadInfos[threadID].members) {
        updates.push({
          userID: member.id,
          time,
          threadID,
          type: updateTypes.UPDATE_THREAD,
        });
      }
    }
    await createUpdates(updates);
  }
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

  const time = earliestFocusedTimeConsideredExpired();
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
    const { platform } = row;
    const versions = JSON.parse(row.versions);
    let thisUserInfo = perUserInfo.get(userID);
    if (!thisUserInfo) {
      thisUserInfo = {
        devices: new Map(),
        threadIDs: new Set(),
        notFocusedThreadIDs: new Set(),
        userNotMemberOfSubthreads: new Set(),
        subthreadsCanSetToUnread: new Set(),
      };
      perUserInfo.set(userID, thisUserInfo);
      // Subthread info will be the same for each subthread, so we only parse
      // it once
      for (const subthread of subthreadPermissionsToCheck) {
        const isSubthreadMember = row[`subthread${subthread}_role`] > 0;
        const rawSubthreadPermissions =
          row[`subthread${subthread}_permissions`];
        const subthreadPermissions = JSON.parse(rawSubthreadPermissions);
        const canSeeSubthread = permissionLookup(
          subthreadPermissions,
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
          !permissionLookup(subthreadPermissions, threadPermissions.VISIBLE)
        ) {
          thisUserInfo.userNotMemberOfSubthreads.add(subthread);
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

  const messageInfosPerUser = {};
  const latestMessagesPerUser: LatestMessagesPerUser = new Map();
  const userPushInfoPromises = {};
  for (const pair of perUserInfo) {
    const [userID, preUserPushInfo] = pair;

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

    const { userNotMemberOfSubthreads } = preUserPushInfo;
    const userDevices = [...preUserPushInfo.devices.values()];
    if (userDevices.length === 0) {
      continue;
    }

    const userPushInfoMessageInfoPromises = [];
    for (const threadID of preUserPushInfo.notFocusedThreadIDs) {
      const messageIndices = threadsToMessageIndices.get(threadID);
      invariant(messageIndices, `indices should exist for thread ${threadID}`);
      userPushInfoMessageInfoPromises.push(
        ...messageIndices.map(async messageIndex => {
          const messageInfo = messageInfos[messageIndex];
          const { type } = messageInfo;
          if (messageInfo.creatorID === userID) {
            // We never send a user notifs about their own activity
            return undefined;
          }
          const { generatesNotifs } = messageSpecs[type];
          const doesGenerateNotif = await generatesNotifs(messageInfo, {
            notifTargetUserID: userID,
            userNotMemberOfSubthreads,
            fetchMessageInfoByID: (messageID: string) =>
              fetchMessageInfoByID(viewer, messageID),
          });
          return doesGenerateNotif === pushTypes.NOTIF
            ? messageInfo
            : undefined;
        }),
      );
    }
    const userPushInfoPromise = (async () => {
      const pushMessageInfos = await Promise.all(
        userPushInfoMessageInfoPromises,
      );
      const filteredMessageInfos = pushMessageInfos.filter(Boolean);
      if (filteredMessageInfos.length === 0) {
        return undefined;
      }
      return {
        devices: userDevices,
        messageInfos: filteredMessageInfos,
      };
    })();
    userPushInfoPromises[userID] = userPushInfoPromise;
  }

  const latestMessages = flattenLatestMessagesPerUser(latestMessagesPerUser);

  const [pushInfo] = await Promise.all([
    promiseAll(userPushInfoPromises),
    createReadStatusUpdates(latestMessages),
    redisPublish(viewer, messageInfosPerUser, updatesForCurrentSession),
    updateLatestMessages(latestMessages),
  ]);

  await sendPushNotifs(_pickBy(Boolean)(pushInfo));
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
  const { threadIDs, notFocusedThreadIDs, subthreadsCanSetToUnread } =
    preUserPushInfo;
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
    .filter(message => !message.latestReadMessage)
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
