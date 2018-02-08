// @flow

import type { MessageData, RawMessageInfo } from 'lib/types/message-types';

import invariant from 'invariant';

import { messageType } from 'lib/types/message-types';
import {
  visibilityRules,
  threadPermissions,
  assertVisibilityRules,
} from 'lib/types/thread-types';
import { rawMessageInfoFromMessageData } from 'lib/shared/message-utils';
import { earliestTimeConsideredCurrent } from 'lib/shared/ping-utils';
import { permissionHelper } from 'lib/permissions/thread-permissions';

import {
  pool,
  SQL,
  SQLStatement,
  appendSQLArray,
  mergeAndConditions,
  mergeOrConditions,
} from '../database';
import createIDs from './id-creator';
import { sendPushNotifs } from '../push/send';

type ThreadRestriction = {|
  creatorID?: ?string,
  subthread?: ?string,
|};

async function createMessages(
  messageDatas: MessageData[],
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
  const threadsToMessageIndices: Map<string, number[]> = new Map();
  const messageInsertRows = [];
  const messageInfos: RawMessageInfo[] = [];
  for (let i = 0; i < messageDatas.length; i++) {
    const messageData = messageDatas[i];
    const threadID = messageData.threadID;
    const creatorID = messageData.creatorID;

    if (messageData.type === messageType.CREATE_SUB_THREAD) {
      subthreadPermissionsToCheck.add(messageData.childThreadID);
    }

    if (!threadRestrictions.has(threadID)) {
      const newThreadRestriction: ThreadRestriction = { creatorID };
      if (messageData.type === messageType.CREATE_SUB_THREAD) {
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
        (messageData.type !== messageType.CREATE_SUB_THREAD ||
          threadRestriction.subthread !== messageData.childThreadID)
      ) {
        newThreadRestriction = {
          creatorID: newThreadRestriction.creatorID,
          subthread: undefined,
        };
      }
      if (newThreadRestriction !== newThreadRestriction) {
        threadRestrictions.set(threadID, newThreadRestriction);
      }
    }

    if (!threadsToMessageIndices.has(threadID)) {
      threadsToMessageIndices.set(threadID, [i]);
    } else {
      const currentMessageIndices = threadsToMessageIndices.get(threadID);
      invariant(
        currentMessageIndices,
        `message indices for thread ${threadID} should exist`,
      );
      threadsToMessageIndices.set(threadID, [...currentMessageIndices, i]);
    }

    let content;
    if (messageData.type === messageType.CREATE_THREAD) {
      content = JSON.stringify(messageData.initialThreadState);
    } else if (messageData.type === messageType.CREATE_SUB_THREAD) {
      content = messageData.childThreadID;
    } else if (messageData.type === messageType.TEXT) {
      content = messageData.text;
    } else if (messageData.type === messageType.ADD_MEMBERS) {
      content = JSON.stringify(messageData.addedUserIDs);
    } else if (messageData.type === messageType.CHANGE_SETTINGS) {
      content = JSON.stringify({
        [messageData.field]: messageData.value,
      });
    } else if (messageData.type === messageType.REMOVE_MEMBERS) {
      content = JSON.stringify(messageData.removedUserIDs);
    } else if (messageData.type === messageType.CHANGE_ROLE) {
      content = JSON.stringify({
        userIDs: messageData.userIDs,
        newRole: messageData.newRole,
      });
    } else if (
      messageData.type === messageType.CREATE_ENTRY ||
      messageData.type === messageType.EDIT_ENTRY
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

  const messageInsertQuery = SQL`
    INSERT INTO messages(id, thread, user, type, content, time)
    VALUES ${messageInsertRows}
  `;
  // This returns a Promise but we don't want to wait on it
  sendPushNotifsForNewMessages(
    threadRestrictions,
    subthreadPermissionsToCheck,
    threadsToMessageIndices,
    messageInfos,
  );
  await Promise.all([
    pool.query(messageInsertQuery),
    updateUnreadStatus(threadRestrictions),
  ]);

  return messageInfos;
}

async function updateUnreadStatus(
  threadRestrictions: Map<string, ThreadRestriction>,
) {
  const knowOfExtractString = `$.${threadPermissions.KNOW_OF}.value`;
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
      const condition = SQL`(JSON_EXTRACT(stm`;
      condition.append(index);
      condition.append(SQL`.permissions, ${knowOfExtractString}) IS TRUE `);
      condition.append(SQL`OR st`);
      condition.append(index);
      condition.append(SQL`.visibility_rules = ${visibilityRules.OPEN})`);
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
    UPDATE memberships m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN focused f ON f.user = m.user AND f.thread = m.thread
      AND f.time > ${time}
  `;
  appendSQLArray(query, subthreadJoins, SQL` `);
  query.append(SQL`
    SET m.unread = 1
    WHERE m.role != 0 AND f.user IS NULL AND (
      JSON_EXTRACT(m.permissions, ${visibleExtractString}) IS TRUE
      OR t.visibility_rules = ${visibilityRules.OPEN}
    ) AND
  `);
  query.append(conditionClause);
  await pool.query(query);
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
    const conditions = getSQLConditionsForThreadRestriction(
      threadID,
      threadRestriction,
    );
    threadConditionClauses.push(mergeAndConditions(conditions));
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
      st${index}.visibility_rules AS subthread${subthread}_visibility_rules,
      stm${index}.role AS subthread${subthread}_role
    `;
    subthreadJoins.push(subthreadJoin(index, subthread));
  }

  const time = earliestTimeConsideredCurrent();
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT m.user, m.thread, c.ios_device_token, c.android_device_token
  `;
  query.append(subthreadSelects);
  query.append(SQL`
    FROM memberships m
    LEFT JOIN threads t ON t.id = m.thread
    LEFT JOIN cookies c ON c.user = m.user
      AND (c.ios_device_token IS NOT NULL OR c.android_device_token IS NOT NULL)
    LEFT JOIN focused f ON f.user = m.user AND f.thread = m.thread
      AND f.time > ${time}
  `);
  appendSQLArray(query, subthreadJoins, SQL` `);
  query.append(SQL`
    WHERE m.role != 0 AND c.user IS NOT NULL AND f.user IS NULL AND
      (
        JSON_EXTRACT(m.permissions, ${visibleExtractString}) IS TRUE
        OR t.visibility_rules = ${visibilityRules.OPEN}
      ) AND
  `);
  query.append(conditionClause);

  const prePushInfo = new Map();
  const [ result ] = await pool.query(query);
  for (let row of result) {
    const userID = row.user.toString();
    const threadID = row.thread.toString();
    const iosDeviceToken = row.ios_device_token;
    const androidDeviceToken = row.android_device_token;
    let preUserPushInfo = prePushInfo.get(userID);
    if (!preUserPushInfo) {
      preUserPushInfo = {
        devices: new Map(),
        threadIDs: new Set(),
        subthreads: new Set(),
      };
      for (let subthread of subthreadPermissionsToCheck) {
        const permissionsInfo = {
          permissions: row[`subthread${subthread}_permissions`],
          visibilityRules: assertVisibilityRules(
            row[`subthread${subthread}_visibility_rules`],
          ),
        };
        const isSubthreadMember = !!row[`subthread${subthread}_role`];
        // Only include the notification from the superthread if there is no
        // notification from the subthread
        if (
          permissionHelper(permissionsInfo, threadPermissions.KNOW_OF) &&
          (!isSubthreadMember ||
            !permissionHelper(permissionsInfo, threadPermissions.VISIBLE))
        ) {
          preUserPushInfo.subthreads.add(subthread);
        }
      }
    }
    if (iosDeviceToken) {
      preUserPushInfo.devices.set(iosDeviceToken, {
        deviceType: "ios",
        deviceToken: iosDeviceToken,
      });
    } else if (androidDeviceToken) {
      preUserPushInfo.devices.set(androidDeviceToken, {
        deviceType: "android",
        deviceToken: androidDeviceToken,
      });
    }
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
          messageInfo.type !== messageType.CREATE_SUB_THREAD ||
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
  const join = SQL`LEFT JOIN threads `;
  join.append(`st${index} ON st${index}.`);
  join.append(SQL`id = ${subthread} `);
  join.append(`LEFT JOIN memberships stm${index} ON stm${index}.`);
  join.append(SQL`thread = ${subthread} AND `);
  join.append(`stm${index}.user = m.user`);
  return join;
}

export default createMessages;
