// @flow

import {
  messageTypes,
  type MessageData,
  type RawMessageInfo,
} from 'lib/types/message-types';
import { threadPermissions } from 'lib/types/thread-types';
import { updateTypes } from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';

import invariant from 'invariant';

import {
  rawMessageInfoFromMessageData,
  messageTypeGeneratesNotifs,
  shimUnsupportedRawMessageInfos,
} from 'lib/shared/message-utils';
import { earliestTimeConsideredCurrent } from 'lib/shared/ping-utils';
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

type ThreadRestriction = {|
  creatorID?: ?string,
  subthread?: ?string,
|};

// Does not do permission checks! (checkThreadPermission)
async function createMessages(
  viewer: Viewer,
  messageDatas: $ReadOnlyArray<MessageData>,
): Promise<RawMessageInfo[]> {
  if (messageDatas.length === 0) {
    return [];
  }

  const ids = await createIDs("messages", messageDatas.length);

  // threadRestrictions contains the conditions that must be met for a
  // membership row to be set to unread or the corresponding user notified for a
  // given thread
  const subthreadPermissionsToCheck: Set<string> = new Set();
  const threadRestrictions: Map<string, ThreadRestriction> = new Map();
  const threadsToNotifMessageIndices: Map<string, number[]> = new Map();
  const messageInsertRows = [];
  const messageInfos: RawMessageInfo[] = [];
  for (let i = 0; i < messageDatas.length; i++) {
    const messageData = messageDatas[i];
    const threadID = messageData.threadID;
    const creatorID = messageData.creatorID;

    if (messageData.type === messageTypes.CREATE_SUB_THREAD) {
      subthreadPermissionsToCheck.add(messageData.childThreadID);
    }

    if (!threadRestrictions.has(threadID)) {
      const newThreadRestriction: ThreadRestriction = { creatorID };
      if (messageData.type === messageTypes.CREATE_SUB_THREAD) {
        newThreadRestriction.subthread = messageData.childThreadID;
      }
      threadRestrictions.set(threadID, newThreadRestriction);
    } else {
      const threadRestriction = threadRestrictions.get(threadID);
      invariant(
        threadRestriction,
        `threadRestriction for thread ${threadID} should exist`,
      );
      let newThreadRestriction: ThreadRestriction = threadRestriction;
      if (
        threadRestriction.creatorID &&
        threadRestriction.creatorID !== creatorID
      ) {
        newThreadRestriction = {
          creatorID: undefined,
          subthread: newThreadRestriction.subthread,
        };
      }
      if (
        threadRestriction.subthread &&
        (messageData.type !== messageTypes.CREATE_SUB_THREAD ||
          threadRestriction.subthread !== messageData.childThreadID)
      ) {
        newThreadRestriction = {
          creatorID: newThreadRestriction.creatorID,
          subthread: undefined,
        };
      }
      if (newThreadRestriction !== threadRestriction) {
        threadRestrictions.set(threadID, newThreadRestriction);
      }
    }

    if (messageTypeGeneratesNotifs(messageData.type)) {
      const messageIndices = threadsToNotifMessageIndices.get(threadID);
      if (messageIndices) {
        threadsToNotifMessageIndices.set(threadID, [...messageIndices, i]);
      } else {
        threadsToNotifMessageIndices.set(threadID, [i]);
      }
    }

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
    messageInsertRows.push([
      ids[i],
      threadID,
      creatorID,
      messageData.type,
      content,
      messageData.time,
    ]);

    messageInfos.push(rawMessageInfoFromMessageData(messageData, ids[i]));
  }

  // These return Promises but we don't want to wait on them
  handleAsyncPromise(sendPushNotifsForNewMessages(
    threadRestrictions,
    subthreadPermissionsToCheck,
    threadsToNotifMessageIndices,
    messageInfos,
  ));
  handleAsyncPromise(updateUnreadStatus(threadRestrictions));

  const messageInsertQuery = SQL`
    INSERT INTO messages(id, thread, user, type, content, time)
    VALUES ${messageInsertRows}
  `;
  await dbQuery(messageInsertQuery);

  return shimUnsupportedRawMessageInfos(
    messageInfos,
    viewer.platformDetails,
  );
}

const knowOfExtractString = `$.${threadPermissions.KNOW_OF}.value`;

async function updateUnreadStatus(
  threadRestrictions: Map<string, ThreadRestriction>,
) {
  let joinIndex = 0;
  const joinSubthreads: Map<string, number> = new Map();
  const threadConditionClauses = [];
  for (let pair of threadRestrictions) {
    const [ threadID, threadRestriction ] = pair;
    const conditions = getSQLConditionsForThreadRestriction(
      threadID,
      threadRestriction,
    );
    if (threadRestriction.subthread) {
      const subthread = threadRestriction.subthread;
      let index = joinSubthreads.get(subthread);
      if (index === undefined) {
        index = joinIndex++;
        joinSubthreads.set(subthread, index);
      }
      const condition = SQL`JSON_EXTRACT(stm`;
      condition.append(index);
      condition.append(SQL`.permissions, ${knowOfExtractString}) IS TRUE`);
      conditions.push(condition);
    }
    threadConditionClauses.push(mergeAndConditions(conditions));
  }
  const conditionClause = mergeOrConditions(threadConditionClauses);

  const subthreadJoins = [];
  for (let pair of joinSubthreads) {
    const [ subthread, index ] = pair;
    subthreadJoins.push(subthreadJoin(index, subthread));
  }

  const time = earliestTimeConsideredCurrent();
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT m.user, m.thread
    FROM memberships m
    LEFT JOIN focused f ON f.user = m.user AND f.thread = m.thread
      AND f.time > ${time}
  `;
  appendSQLArray(query, subthreadJoins, SQL` `);
  query.append(SQL`
    WHERE m.role != 0 AND f.user IS NULL AND
      JSON_EXTRACT(m.permissions, ${visibleExtractString}) IS TRUE AND
  `);
  query.append(conditionClause);
  const [ result ] = await dbQuery(query);

  const setUnreadPairs = result.map(row => ({
    userID: row.user.toString(),
    threadID: row.thread.toString(),
  }));
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

async function sendPushNotifsForNewMessages(
  threadRestrictions: Map<string, ThreadRestriction>,
  subthreadPermissionsToCheck: Set<string>,
  threadsToMessageIndices: Map<string, number[]>,
  messageInfos: RawMessageInfo[],
) {
  const threadConditionClauses = [];
  for (let pair of threadRestrictions) {
    const [ threadID, threadRestriction ] = pair;
    if (!threadsToMessageIndices.has(threadID)) {
      continue;
    }
    const conditions = getSQLConditionsForThreadRestriction(
      threadID,
      threadRestriction,
    );
    threadConditionClauses.push(mergeAndConditions(conditions));
  }
  if (threadConditionClauses.length === 0) {
    return;
  }
  const conditionClause = mergeOrConditions(threadConditionClauses);

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
    subthreadJoins.push(subthreadJoin(index, subthread));
  }

  const time = earliestTimeConsideredCurrent();
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT m.user, m.thread, c.platform, c.device_token, c.versions
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
    WHERE m.role != 0 AND c.user IS NOT NULL AND f.user IS NULL AND
      JSON_EXTRACT(m.permissions, ${visibleExtractString}) IS TRUE AND
  `);
  query.append(conditionClause);

  const prePushInfo = new Map();
  const [ result ] = await dbQuery(query);
  for (let row of result) {
    const userID = row.user.toString();
    const threadID = row.thread.toString();
    const deviceToken = row.device_token;
    const { platform, versions } = row;
    let preUserPushInfo = prePushInfo.get(userID);
    if (!preUserPushInfo) {
      preUserPushInfo = {
        devices: new Map(),
        threadIDs: new Set(),
        subthreads: new Set(),
      };
      for (let subthread of subthreadPermissionsToCheck) {
        const permissions = row[`subthread${subthread}_permissions`];
        const isSubthreadMember = !!row[`subthread${subthread}_role`];
        // Only include the notification from the superthread if there is no
        // notification from the subthread
        if (
          permissionLookup(permissions, threadPermissions.KNOW_OF) &&
          (!isSubthreadMember ||
            !permissionLookup(permissions, threadPermissions.VISIBLE))
        ) {
          preUserPushInfo.subthreads.add(subthread);
        }
      }
    }
    preUserPushInfo.devices.set(deviceToken, {
      deviceType: platform,
      deviceToken,
      codeVersion: versions ? versions.codeVersion : null,
    });
    preUserPushInfo.threadIDs.add(threadID);
    prePushInfo.set(userID, preUserPushInfo);
  }

  const pushInfo = {};
  for (let pair of prePushInfo) {
    const [ userID, preUserPushInfo ] = pair;
    const userPushInfo = {
      devices: [...preUserPushInfo.devices.values()],
      messageInfos: [],
    };
    for (let threadID of preUserPushInfo.threadIDs) {
      const messageIndices = threadsToMessageIndices.get(threadID);
      invariant(messageIndices, `indices should exist for thread ${threadID}`);
      for (let messageIndex of messageIndices) {
        const messageInfo = messageInfos[messageIndex];
        if (
          messageInfo.type !== messageTypes.CREATE_SUB_THREAD ||
          preUserPushInfo.subthreads.has(messageInfo.childThreadID)
        ) {
          userPushInfo.messageInfos.push(messageInfo);
        }
      }
    }
    if (userPushInfo.messageInfos.length > 0) {
      pushInfo[userID] = userPushInfo;
    }
  }

  await sendPushNotifs(pushInfo);
}

// Note: does *not* consider subthread
function getSQLConditionsForThreadRestriction(
  threadID: string,
  threadRestriction: ThreadRestriction,
): SQLStatement[] {
  const conditions = [SQL`m.thread = ${threadID}`];
  if (threadRestriction.creatorID) {
    conditions.push(SQL`m.user != ${threadRestriction.creatorID}`);
  }
  return conditions;
}

function subthreadJoin(index: number, subthread: string) {
  const join = SQL`LEFT JOIN memberships `;
  join.append(`stm${index} ON stm${index}.`);
  join.append(SQL`thread = ${subthread} AND `);
  join.append(`stm${index}.user = m.user`);
  return join;
}

export default createMessages;
