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
import type { PushType } from 'lib/shared/messages/message-spec.js';
import { messageSpecs } from 'lib/shared/messages/message-specs.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  messageDataLocalID,
  type MessageData,
  type RawMessageInfo,
} from 'lib/types/message-types.js';
import { redisMessageTypes } from 'lib/types/redis-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
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
import { processMessagesForSearch } from '../database/search-utils.js';
import {
  fetchMessageInfoForLocalID,
  fetchMessageInfoByID,
} from '../fetchers/message-fetchers.js';
import { fetchOtherSessionsForViewer } from '../fetchers/session-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { sendPushNotifs, sendRescindNotifs } from '../push/send.js';
import { handleAsyncPromise } from '../responders/handlers.js';
import type { Viewer } from '../session/viewer.js';
import { earliestFocusedTimeConsideredExpired } from '../shared/focused-times.js';
import { publisher } from '../socket/redis.js';
import { creationString } from '../utils/idempotent.js';

type UserThreadInfo = {
  +devices: Map<
    string,
    {
      +platform: string,
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

  const existingMessages = await Promise.all(
    messageDatas.map(messageData =>
      fetchMessageInfoForLocalID(viewer, messageDataLocalID(messageData)),
    ),
  );

  const existingMessageInfos: RawMessageInfo[] = [];
  const newMessageDatas: MessageData[] = [];
  for (let i = 0; i < messageDatas.length; i++) {
    const existingMessage = existingMessages[i];
    if (existingMessage) {
      existingMessageInfos.push(existingMessage);
    } else {
      newMessageDatas.push(messageDatas[i]);
    }
  }
  if (newMessageDatas.length === 0) {
    return shimUnsupportedRawMessageInfos(
      existingMessageInfos,
      viewer.platformDetails,
    );
  }

  const ids = await createIDs('messages', newMessageDatas.length);

  const returnMessageInfos: RawMessageInfo[] = [];
  const subthreadPermissionsToCheck: Set<string> = new Set();
  const messageInsertRows = [];

  // Indices in threadsToMessageIndices point to newMessageInfos
  const newMessageInfos: RawMessageInfo[] = [];
  const threadsToMessageIndices: Map<string, number[]> = new Map();

  let nextNewMessageIndex = 0;
  for (let i = 0; i < messageDatas.length; i++) {
    const existingMessage = existingMessages[i];
    if (existingMessage) {
      returnMessageInfos.push(existingMessage);
      continue;
    }

    const messageData = messageDatas[i];
    const threadID = messageData.threadID;
    const creatorID = messageData.creatorID;

    let messageIndices = threadsToMessageIndices.get(threadID);
    if (!messageIndices) {
      messageIndices = [];
      threadsToMessageIndices.set(threadID, messageIndices);
    }

    const newMessageIndex = nextNewMessageIndex++;
    messageIndices.push(newMessageIndex);

    const serverID = ids[newMessageIndex];

    if (messageData.type === messageTypes.CREATE_SUB_THREAD) {
      subthreadPermissionsToCheck.add(messageData.childThreadID);
    }

    const content =
      messageSpecs[messageData.type].messageContentForServerDB?.(messageData);

    const creation =
      messageData.localID && viewer.hasSessionInfo
        ? creationString(viewer, messageData.localID)
        : null;

    let targetMessageID = null;
    if (messageData.targetMessageID) {
      targetMessageID = messageData.targetMessageID;
    } else if (messageData.sourceMessage) {
      targetMessageID = messageData.sourceMessage.id;
    }

    messageInsertRows.push([
      serverID,
      threadID,
      creatorID,
      messageData.type,
      content,
      messageData.time,
      creation,
      targetMessageID,
    ]);
    const rawMessageInfo = rawMessageInfoFromMessageData(messageData, serverID);
    newMessageInfos.push(rawMessageInfo); // at newMessageIndex
    returnMessageInfos.push(rawMessageInfo); // at i
  }

  const messageInsertQuery = SQL`
    INSERT INTO messages(id, thread, user, type, content, time,
      creation, target_message)
    VALUES ${messageInsertRows}
  `;
  const messageInsertPromise = dbQuery(messageInsertQuery);

  const postMessageSendPromise = postMessageSend(
    viewer,
    threadsToMessageIndices,
    subthreadPermissionsToCheck,
    stripLocalIDs(newMessageInfos),
    newMessageDatas,
    updatesForCurrentSession,
  );
  if (!viewer.isScriptViewer) {
    // If we're not being called from a script, then we avoid awaiting
    // postMessageSendPromise below so that we don't delay the response to the
    // user on external services. In that case, we use handleAsyncPromise to
    // make sure any exceptions are caught and logged.
    handleAsyncPromise(postMessageSendPromise);
  }

  await Promise.all([
    messageInsertPromise,
    updateRepliesCount(threadsToMessageIndices, newMessageDatas),
    viewer.isScriptViewer ? postMessageSendPromise : undefined,
  ]);

  if (updatesForCurrentSession !== 'return') {
    return [];
  }

  return shimUnsupportedRawMessageInfos(
    returnMessageInfos,
    viewer.platformDetails,
  );
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
// (4) Processing messages for search
async function postMessageSend(
  viewer: Viewer,
  threadsToMessageIndices: Map<string, number[]>,
  subthreadPermissionsToCheck: Set<string>,
  messageInfos: RawMessageInfo[],
  messageDatas: MessageData[],
  updatesForCurrentSession: UpdatesForCurrentSession,
) {
  const processForSearch = processMessagesForSearch(messageInfos);

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
        platform,
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
  const userRescindInfoPromises = {};

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

    const generateNotifUserInfoPromise = async (pushType: PushType) => {
      const promises = [];

      for (const threadID of preUserPushInfo.notFocusedThreadIDs) {
        const messageIndices = threadsToMessageIndices.get(threadID);
        invariant(
          messageIndices,
          `indices should exist for thread ${threadID}`,
        );
        promises.push(
          ...messageIndices.map(async messageIndex => {
            const messageInfo = messageInfos[messageIndex];
            const { type } = messageInfo;
            if (messageInfo.creatorID === userID) {
              // We never send a user notifs about their own activity
              return undefined;
            }
            const { generatesNotifs } = messageSpecs[type];
            const messageData = messageDatas[messageIndex];
            const doesGenerateNotif = await generatesNotifs(
              messageInfo,
              messageData,
              {
                notifTargetUserID: userID,
                userNotMemberOfSubthreads,
                fetchMessageInfoByID: (messageID: string) =>
                  fetchMessageInfoByID(viewer, messageID),
              },
            );
            return doesGenerateNotif === pushType
              ? { messageInfo, messageData }
              : undefined;
          }),
        );
      }

      const messagesToNotify = await Promise.all(promises);
      const filteredMessagesToNotify = messagesToNotify.filter(Boolean);

      if (filteredMessagesToNotify.length === 0) {
        return undefined;
      }

      return {
        devices: userDevices,
        messageInfos: filteredMessagesToNotify.map(
          ({ messageInfo }) => messageInfo,
        ),
        messageDatas: filteredMessagesToNotify.map(
          ({ messageData }) => messageData,
        ),
      };
    };

    const userPushInfoPromise = generateNotifUserInfoPromise(pushTypes.NOTIF);
    const userRescindInfoPromise = generateNotifUserInfoPromise(
      pushTypes.RESCIND,
    );

    userPushInfoPromises[userID] = userPushInfoPromise;
    userRescindInfoPromises[userID] = userRescindInfoPromise;
  }

  const latestMessages = flattenLatestMessagesPerUser(latestMessagesPerUser);

  const [pushInfo, rescindInfo] = await Promise.all([
    promiseAll(userPushInfoPromises),
    promiseAll(userRescindInfoPromises),
    createReadStatusUpdates(latestMessages),
    redisPublish(viewer, messageInfosPerUser, updatesForCurrentSession),
    updateLatestMessages(latestMessages),
    processForSearch,
  ]);

  await Promise.all([
    sendPushNotifs(_pickBy(Boolean)(pushInfo)),
    sendRescindNotifs(_pickBy(Boolean)(rescindInfo)),
  ]);
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

  await createUpdates(readStatusUpdates);
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

  dbQuery(query);
}

export default createMessages;
