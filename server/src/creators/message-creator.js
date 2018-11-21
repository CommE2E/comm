// @flow

import {
  messageTypes,
  type MessageData,
  type RawMessageInfo,
} from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';
import { redisMessageTypes } from 'lib/types/redis-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import {
  rawMessageInfoFromMessageData,
  messageTypeGeneratesNotifs,
  shimUnsupportedRawMessageInfos,
} from 'lib/shared/message-utils';
import { permissionLookup } from 'lib/permissions/thread-permissions';

import {
  dbQuery,
  SQL,
  SQLStatement,
  appendSQLArray,
  mergeAndConditions,
  mergeOrConditions,
} from '../database';
import createIDs from './id-creator';
import { sendPushNotifs } from '../push/send';
import { createUpdates } from './update-creator';
import { handleAsyncPromise } from '../responders/handlers';
import { earliestFocusedTimeConsideredCurrent } from '../shared/focused-times';
import { fetchOtherSessionsForViewer } from '../fetchers/session-fetchers';
import { publisher } from '../socket/redis';
import { fetchMessageInfoForLocalID } from '../fetchers/message-fetchers';
import { creationString } from '../utils/idempotent';

// Does not do permission checks! (checkThreadPermission)
async function createMessages(
  viewer: Viewer,
  messageDatas: $ReadOnlyArray<MessageData>,
): Promise<RawMessageInfo[]> {
  if (messageDatas.length === 0) {
    return [];
  }

  const messageInfos: RawMessageInfo[] = [];
  const newMessageDatas: MessageData[] = [];
  const existingMessages = await Promise.all(
    messageDatas.map(messageData => fetchMessageInfoForLocalID(
      viewer,
      messageData.type === messageTypes.TEXT ? messageData.localID : null,
    ))
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
    return shimUnsupportedRawMessageInfos(
      messageInfos,
      viewer.platformDetails,
    );
  }

  const ids = await createIDs("messages", newMessageDatas.length);

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
    }

    const creation = messageData.localID && viewer.hasSessionInfo
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

  handleAsyncPromise(postMessageSend(
    viewer,
    threadsToMessageIndices,
    subthreadPermissionsToCheck,
    messageInfos,
  ));

  const messageInsertQuery = SQL`
    INSERT INTO messages(id, thread, user, type, content, time, creation)
    VALUES ${messageInsertRows}
  `;
  await dbQuery(messageInsertQuery);

  return shimUnsupportedRawMessageInfos(
    messageInfos,
    viewer.platformDetails,
  );
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
) {
  let joinIndex = 0;
  let subthreadSelects = "";
  const subthreadJoins = [];
  for (let subthread of subthreadPermissionsToCheck) {
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
    WHERE (m.role != 0 OR f.user IS NOT NULL) AND
      JSON_EXTRACT(m.permissions, ${visibleExtractString}) IS TRUE AND
      m.thread IN (${[...threadsToMessageIndices.keys()]})
  `);

  const perUserInfo = new Map();
  const [ result ] = await dbQuery(query);
  for (let row of result) {
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
      for (let subthread of subthreadPermissionsToCheck) {
        const isSubthreadMember = !!row[`subthread${subthread}_role`];
        const permissions = row[`subthread${subthread}_permissions`];
        const canSeeSubthread =
          permissionLookup(permissions, threadPermissions.KNOW_OF);
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

  const pushInfo = {}, setUnreadPairs = [], messageInfosPerUser = {};
  for (let pair of perUserInfo) {
    const [ userID, preUserPushInfo ] = pair;
    const { subthreadsCanSetToUnread, subthreadsCanNotify } = preUserPushInfo;
    const userPushInfo = {
      devices: [...preUserPushInfo.devices.values()],
      messageInfos: [],
    };
    const threadIDsToSetToUnread = new Set();
    for (let threadID of preUserPushInfo.notFocusedThreadIDs) {
      const messageIndices = threadsToMessageIndices.get(threadID);
      invariant(messageIndices, `indices should exist for thread ${threadID}`);
      for (let messageIndex of messageIndices) {
        const messageInfo = messageInfos[messageIndex];
        if (messageInfo.creatorID === userID) {
          continue;
        }
        if (
          messageInfo.type !== messageTypes.CREATE_SUB_THREAD ||
          subthreadsCanSetToUnread.has(messageInfo.childThreadID)
        ) {
          threadIDsToSetToUnread.add(threadID);
        }
        if (!messageTypeGeneratesNotifs(messageInfo.type)) {
          continue;
        }
        if (
          messageInfo.type !== messageTypes.CREATE_SUB_THREAD ||
          subthreadsCanNotify.has(messageInfo.childThreadID)
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
    for (let threadID of threadIDsToSetToUnread) {
      setUnreadPairs.push({ userID, threadID });
    }
    const userMessageInfos = [];
    for (let threadID of preUserPushInfo.threadIDs) {
      const messageIndices = threadsToMessageIndices.get(threadID);
      invariant(messageIndices, `indices should exist for thread ${threadID}`);
      for (let messageIndex of messageIndices) {
        const messageInfo = messageInfos[messageIndex];
        userMessageInfos.push(messageInfo);
      }
    }
    if (userMessageInfos.length > 0) {
      messageInfosPerUser[userID] = userMessageInfos;
    }
  }

  await Promise.all([
    sendPushNotifs(pushInfo),
    updateUnreadStatus(setUnreadPairs),
    redisPublish(viewer, messageInfosPerUser),
  ]);
}

async function updateUnreadStatus(
  setUnreadPairs: $ReadOnlyArray<{| userID: string, threadID: string |}>,
) {
  if (setUnreadPairs.length === 0) {
    return;
  }
  const updateConditions = setUnreadPairs.map(
    pair => SQL`(user = ${pair.userID} AND thread = ${pair.threadID})`,
  );
  const updateQuery = SQL`
    UPDATE memberships
    SET unread = 1
    WHERE
  `;
  updateQuery.append(mergeOrConditions(updateConditions));

  const now = Date.now();
  await Promise.all([
    dbQuery(updateQuery),
    createUpdates(setUnreadPairs.map(pair => ({
      type: updateTypes.UPDATE_THREAD_READ_STATUS,
      userID: pair.userID,
      time: now,
      threadID: pair.threadID,
      unread: true,
    }))),
  ]);
}

async function redisPublish(
  viewer: Viewer,
  messageInfosPerUser: {[userID: string]: $ReadOnlyArray<RawMessageInfo>},
) {
  for (let userID in messageInfosPerUser) {
    if (userID === viewer.userID && viewer.hasSessionInfo) {
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
  if (!viewerMessageInfos || !viewer.hasSessionInfo) {
    return;
  }
  const sessionIDs = await fetchOtherSessionsForViewer(viewer);
  for (let sessionID of sessionIDs) {
    publisher.sendMessage(
      { userID: viewer.userID, sessionID },
      {
        type: redisMessageTypes.NEW_MESSAGES,
        messages: viewerMessageInfos,
      },
    );
  }
}

export default createMessages;
