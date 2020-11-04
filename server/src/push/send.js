// @flow

import {
  type RawMessageInfo,
  type MessageInfo,
  messageTypes,
} from 'lib/types/message-types';
import type { ServerThreadInfo, ThreadInfo } from 'lib/types/thread-types';
import type { DeviceType } from 'lib/types/device-types';
import type { CollapsableNotifInfo } from '../fetchers/message-fetchers';
import { updateTypes } from 'lib/types/update-types';
import type { Viewer } from '../session/viewer';

import apn from '@parse/node-apn';
import invariant from 'invariant';
import uuidv4 from 'uuid/v4';
import _flow from 'lodash/fp/flow';
import _mapValues from 'lodash/fp/mapValues';
import _pickBy from 'lodash/fp/pickBy';

import { notifTextsForMessageInfo } from 'lib/shared/notif-utils';
import {
  createMessageInfo,
  sortMessageInfoList,
  shimUnsupportedRawMessageInfos,
} from 'lib/shared/message-utils';
import {
  rawThreadInfoFromServerThreadInfo,
  threadInfoFromRawThreadInfo,
} from 'lib/shared/thread-utils';
import { promiseAll } from 'lib/utils/promises';
import { oldValidUsernameRegex } from 'lib/shared/account-utils';

import { dbQuery, SQL, mergeOrConditions } from '../database/database';
import { apnPush, fcmPush, getUnreadCounts } from './utils';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers';
import { fetchUserInfos } from '../fetchers/user-fetchers';
import { fetchCollapsableNotifs } from '../fetchers/message-fetchers';
import createIDs from '../creators/id-creator';
import { createUpdates } from '../creators/update-creator';

type Device = {|
  +deviceType: DeviceType,
  +deviceToken: string,
  +codeVersion: ?number,
|};
type PushUserInfo = {|
  +devices: Device[],
  +messageInfos: RawMessageInfo[],
|};
type Delivery = IOSDelivery | AndroidDelivery | {| collapsedInto: string |};
type NotificationRow = {|
  +dbID: string,
  +userID: string,
  +threadID?: ?string,
  +messageID?: ?string,
  +collapseKey?: ?string,
  +deliveries: Delivery[],
|};
export type PushInfo = { [userID: string]: PushUserInfo };

async function sendPushNotifs(pushInfo: PushInfo) {
  if (Object.keys(pushInfo).length === 0) {
    return;
  }

  const [
    unreadCounts,
    { usersToCollapsableNotifInfo, serverThreadInfos, userInfos },
    dbIDs,
  ] = await Promise.all([
    getUnreadCounts(Object.keys(pushInfo)),
    fetchInfos(pushInfo),
    createDBIDs(pushInfo),
  ]);

  const deliveryPromises = [];
  const notifications: Map<string, NotificationRow> = new Map();
  for (let userID in usersToCollapsableNotifInfo) {
    const threadInfos = _flow(
      _mapValues((serverThreadInfo: ServerThreadInfo) => {
        const rawThreadInfo = rawThreadInfoFromServerThreadInfo(
          serverThreadInfo,
          userID,
        );
        if (!rawThreadInfo) {
          return null;
        }
        return threadInfoFromRawThreadInfo(rawThreadInfo, userID, userInfos);
      }),
      _pickBy((threadInfo) => threadInfo),
    )(serverThreadInfos);
    for (let notifInfo of usersToCollapsableNotifInfo[userID]) {
      const hydrateMessageInfo = (rawMessageInfo: RawMessageInfo) =>
        createMessageInfo(rawMessageInfo, userID, userInfos, threadInfos);
      const newMessageInfos = [];
      const newRawMessageInfos = [];
      for (let newRawMessageInfo of notifInfo.newMessageInfos) {
        const newMessageInfo = hydrateMessageInfo(newRawMessageInfo);
        if (newMessageInfo) {
          newMessageInfos.push(newMessageInfo);
          newRawMessageInfos.push(newRawMessageInfo);
        }
      }
      if (newMessageInfos.length === 0) {
        continue;
      }
      const existingMessageInfos = notifInfo.existingMessageInfos
        .map(hydrateMessageInfo)
        .filter(Boolean);
      const allMessageInfos = sortMessageInfoList([
        ...newMessageInfos,
        ...existingMessageInfos,
      ]);
      const [
        firstNewMessageInfo,
        ...remainingNewMessageInfos
      ] = newMessageInfos;
      const threadID = firstNewMessageInfo.threadID;

      const threadInfo = threadInfos[threadID];
      const updateBadge = threadInfo.currentUser.subscription.home;
      const displayBanner = threadInfo.currentUser.subscription.pushNotifs;
      const username = userInfos[userID] && userInfos[userID].username;
      const userWasMentioned =
        username &&
        threadInfo.currentUser.role &&
        oldValidUsernameRegex.test(username) &&
        firstNewMessageInfo.type === messageTypes.TEXT &&
        new RegExp(`\\B@${username}\\b`, 'i').test(firstNewMessageInfo.text);
      if (!updateBadge && !displayBanner && !userWasMentioned) {
        continue;
      }
      const badgeOnly = !displayBanner && !userWasMentioned;

      const dbID = dbIDs.shift();
      invariant(dbID, 'should have sufficient DB IDs');
      const byDeviceType = getDevicesByDeviceType(pushInfo[userID].devices);
      const firstMessageID = firstNewMessageInfo.id;
      invariant(firstMessageID, 'RawMessageInfo.id should be set on server');
      const notificationInfo = {
        source: 'new_message',
        dbID,
        userID,
        threadID,
        messageID: firstMessageID,
        collapseKey: notifInfo.collapseKey,
      };

      const iosVersionsToTokens = byDeviceType.get('ios');
      if (iosVersionsToTokens) {
        for (const [codeVer, deviceTokens] of iosVersionsToTokens) {
          const codeVersion = parseInt(codeVer, 10); // only for Flow
          const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            { platform: 'ios', codeVersion },
          );
          const notification = prepareIOSNotification(
            allMessageInfos,
            shimmedNewRawMessageInfos,
            threadInfo,
            notifInfo.collapseKey,
            badgeOnly,
            unreadCounts[userID],
          );
          deliveryPromises.push(
            sendIOSNotification(notification, [...deviceTokens], {
              ...notificationInfo,
              codeVersion,
            }),
          );
        }
      }
      const androidVersionsToTokens = byDeviceType.get('android');
      if (androidVersionsToTokens) {
        for (const [codeVer, deviceTokens] of androidVersionsToTokens) {
          const codeVersion = parseInt(codeVer, 10); // only for Flow
          const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            { platform: 'android', codeVersion },
          );
          const notification = prepareAndroidNotification(
            allMessageInfos,
            shimmedNewRawMessageInfos,
            threadInfo,
            notifInfo.collapseKey,
            badgeOnly,
            unreadCounts[userID],
            dbID,
            codeVersion,
          );
          deliveryPromises.push(
            sendAndroidNotification(notification, [...deviceTokens], {
              ...notificationInfo,
              codeVersion,
            }),
          );
        }
      }

      for (let newMessageInfo of remainingNewMessageInfos) {
        const newDBID = dbIDs.shift();
        invariant(newDBID, 'should have sufficient DB IDs');
        const messageID = newMessageInfo.id;
        invariant(messageID, 'RawMessageInfo.id should be set on server');
        notifications.set(newDBID, {
          dbID: newDBID,
          userID,
          threadID: newMessageInfo.threadID,
          messageID,
          collapseKey: notifInfo.collapseKey,
          deliveries: [{ collapsedInto: dbID }],
        });
      }
    }
  }

  const cleanUpPromises = [];
  if (dbIDs.length > 0) {
    const query = SQL`DELETE FROM ids WHERE id IN (${dbIDs})`;
    cleanUpPromises.push(dbQuery(query));
  }
  const [deliveryResults] = await Promise.all([
    Promise.all(deliveryPromises),
    Promise.all(cleanUpPromises),
  ]);

  await saveNotifResults(deliveryResults, notifications, true);
}

// The results in deliveryResults will be combined with the rows
// in rowsToSave and then written to the notifications table
async function saveNotifResults(
  deliveryResults: $ReadOnlyArray<IOSResult | AndroidResult>,
  inputRowsToSave: Map<string, NotificationRow>,
  rescindable: boolean,
) {
  const rowsToSave = new Map(inputRowsToSave);

  const allInvalidTokens = [];
  for (const deliveryResult of deliveryResults) {
    const { info, delivery, invalidTokens } = deliveryResult;
    const { dbID, userID } = info;
    const curNotifRow = rowsToSave.get(dbID);
    if (curNotifRow) {
      curNotifRow.deliveries.push(delivery);
    } else {
      // Ternary expressions for Flow
      const threadID = info.threadID ? info.threadID : null;
      const messageID = info.messageID ? info.messageID : null;
      const collapseKey = info.collapseKey ? info.collapseKey : null;
      rowsToSave.set(dbID, {
        dbID,
        userID,
        threadID,
        messageID,
        collapseKey,
        deliveries: [delivery],
      });
    }
    if (invalidTokens) {
      allInvalidTokens.push({
        userID,
        tokens: invalidTokens,
      });
    }
  }

  const notificationRows = [];
  for (const notification of rowsToSave.values()) {
    notificationRows.push([
      notification.dbID,
      notification.userID,
      notification.threadID,
      notification.messageID,
      notification.collapseKey,
      JSON.stringify(notification.deliveries),
      Number(!rescindable),
    ]);
  }

  const dbPromises = [];
  if (allInvalidTokens.length > 0) {
    dbPromises.push(removeInvalidTokens(allInvalidTokens));
  }
  if (notificationRows.length > 0) {
    const query = SQL`
      INSERT INTO notifications
        (id, user, thread, message, collapse_key, delivery, rescinded)
      VALUES ${notificationRows}
    `;
    dbPromises.push(dbQuery(query));
  }
  if (dbPromises.length > 0) {
    await Promise.all(dbPromises);
  }
}

async function fetchInfos(pushInfo: PushInfo) {
  const usersToCollapsableNotifInfo = await fetchCollapsableNotifs(pushInfo);

  const threadIDs = new Set();
  const threadWithChangedNamesToMessages = new Map();
  const addThreadIDsFromMessageInfos = (rawMessageInfo: RawMessageInfo) => {
    const threadID = rawMessageInfo.threadID;
    threadIDs.add(threadID);
    if (
      rawMessageInfo.type === messageTypes.CREATE_THREAD &&
      rawMessageInfo.initialThreadState.parentThreadID
    ) {
      threadIDs.add(rawMessageInfo.initialThreadState.parentThreadID);
    } else if (rawMessageInfo.type === messageTypes.CREATE_SUB_THREAD) {
      threadIDs.add(rawMessageInfo.childThreadID);
    }
    if (
      rawMessageInfo.type === messageTypes.CHANGE_SETTINGS &&
      rawMessageInfo.field === 'name'
    ) {
      const messages = threadWithChangedNamesToMessages.get(threadID);
      if (messages) {
        messages.push(rawMessageInfo.id);
      } else {
        threadWithChangedNamesToMessages.set(threadID, [rawMessageInfo.id]);
      }
    }
  };
  for (let userID in usersToCollapsableNotifInfo) {
    for (let notifInfo of usersToCollapsableNotifInfo[userID]) {
      for (let rawMessageInfo of notifInfo.existingMessageInfos) {
        addThreadIDsFromMessageInfos(rawMessageInfo);
      }
      for (let rawMessageInfo of notifInfo.newMessageInfos) {
        addThreadIDsFromMessageInfos(rawMessageInfo);
      }
    }
  }

  const promises = {};
  // These threadInfos won't have currentUser set
  promises.threadResult = fetchServerThreadInfos(
    SQL`t.id IN (${[...threadIDs]})`,
  );
  if (threadWithChangedNamesToMessages.size > 0) {
    const typesThatAffectName = [
      messageTypes.CHANGE_SETTINGS,
      messageTypes.CREATE_THREAD,
    ];
    const oldNameQuery = SQL`
      SELECT IF(
        JSON_TYPE(JSON_EXTRACT(m.content, "$.name")) = 'NULL',
        "",
        JSON_UNQUOTE(JSON_EXTRACT(m.content, "$.name"))
      ) AS name, m.thread
      FROM (
        SELECT MAX(id) AS id
        FROM messages
        WHERE type IN (${typesThatAffectName})
          AND JSON_EXTRACT(content, "$.name") IS NOT NULL
          AND`;
    const threadClauses = [];
    for (let [threadID, messages] of threadWithChangedNamesToMessages) {
      threadClauses.push(
        SQL`(thread = ${threadID} AND id NOT IN (${messages}))`,
      );
    }
    oldNameQuery.append(mergeOrConditions(threadClauses));
    oldNameQuery.append(SQL`
        GROUP BY thread
      ) x
      LEFT JOIN messages m ON m.id = x.id
    `);
    promises.oldNames = dbQuery(oldNameQuery);
  }

  const { threadResult, oldNames } = await promiseAll(promises);
  const serverThreadInfos = threadResult.threadInfos;
  if (oldNames) {
    const [result] = oldNames;
    for (let row of result) {
      const threadID = row.thread.toString();
      serverThreadInfos[threadID].name = row.name;
    }
  }

  const userInfos = await fetchNotifUserInfos(
    serverThreadInfos,
    usersToCollapsableNotifInfo,
  );

  return { usersToCollapsableNotifInfo, serverThreadInfos, userInfos };
}

async function fetchNotifUserInfos(
  serverThreadInfos: { [threadID: string]: ServerThreadInfo },
  usersToCollapsableNotifInfo: { [userID: string]: CollapsableNotifInfo[] },
) {
  const missingUserIDs = new Set();

  for (const threadID in serverThreadInfos) {
    const serverThreadInfo = serverThreadInfos[threadID];
    for (const member of serverThreadInfo.members) {
      missingUserIDs.add(member.id);
    }
  }

  const addUserIDsFromMessageInfos = (rawMessageInfo: RawMessageInfo) => {
    missingUserIDs.add(rawMessageInfo.creatorID);
    if (rawMessageInfo.type === messageTypes.ADD_MEMBERS) {
      for (const userID of rawMessageInfo.addedUserIDs) {
        missingUserIDs.add(userID);
      }
    } else if (rawMessageInfo.type === messageTypes.REMOVE_MEMBERS) {
      for (const userID of rawMessageInfo.removedUserIDs) {
        missingUserIDs.add(userID);
      }
    } else if (rawMessageInfo.type === messageTypes.CREATE_THREAD) {
      for (const userID of rawMessageInfo.initialThreadState.memberIDs) {
        missingUserIDs.add(userID);
      }
    }
  };

  for (const userID in usersToCollapsableNotifInfo) {
    for (const notifInfo of usersToCollapsableNotifInfo[userID]) {
      for (const rawMessageInfo of notifInfo.existingMessageInfos) {
        addUserIDsFromMessageInfos(rawMessageInfo);
      }
      for (const rawMessageInfo of notifInfo.newMessageInfos) {
        addUserIDsFromMessageInfos(rawMessageInfo);
      }
    }
  }

  return await fetchUserInfos([...missingUserIDs]);
}

async function createDBIDs(pushInfo: PushInfo): Promise<string[]> {
  let numIDsNeeded = 0;
  for (let userID in pushInfo) {
    numIDsNeeded += pushInfo[userID].messageInfos.length;
  }
  return await createIDs('notifications', numIDsNeeded);
}

function getDevicesByDeviceType(
  devices: Device[],
): Map<DeviceType, Map<number, Set<string>>> {
  const byDeviceType = new Map();
  for (let device of devices) {
    let innerMap = byDeviceType.get(device.deviceType);
    if (!innerMap) {
      innerMap = new Map();
      byDeviceType.set(device.deviceType, innerMap);
    }
    const codeVersion: number =
      device.codeVersion !== null && device.codeVersion !== undefined
        ? device.codeVersion
        : -1;
    let innerMostSet = innerMap.get(codeVersion);
    if (!innerMostSet) {
      innerMostSet = new Set();
      innerMap.set(codeVersion, innerMostSet);
    }
    innerMostSet.add(device.deviceToken);
  }
  return byDeviceType;
}

function prepareIOSNotification(
  allMessageInfos: MessageInfo[],
  newRawMessageInfos: RawMessageInfo[],
  threadInfo: ThreadInfo,
  collapseKey: ?string,
  badgeOnly: boolean,
  unreadCount: number,
): apn.Notification {
  const uniqueID = uuidv4();
  const notification = new apn.Notification();
  notification.topic = 'org.squadcal.app';

  const { merged, ...rest } = notifTextsForMessageInfo(
    allMessageInfos,
    threadInfo,
  );
  if (!badgeOnly) {
    notification.body = merged;
    notification.sound = 'default';
  }
  notification.payload = {
    ...notification.payload,
    ...rest,
  };

  notification.badge = unreadCount;
  notification.threadId = threadInfo.id;
  notification.id = uniqueID;
  notification.pushType = 'alert';
  notification.payload.id = uniqueID;
  notification.payload.threadID = threadInfo.id;
  notification.payload.messageInfos = JSON.stringify(newRawMessageInfos);
  if (collapseKey) {
    notification.collapseId = collapseKey;
  }
  return notification;
}

function prepareAndroidNotification(
  allMessageInfos: MessageInfo[],
  newRawMessageInfos: RawMessageInfo[],
  threadInfo: ThreadInfo,
  collapseKey: ?string,
  badgeOnly: boolean,
  unreadCount: number,
  dbID: string,
  codeVersion: number,
): Object {
  const notifID = collapseKey ? collapseKey : dbID;
  const { merged, ...rest } = notifTextsForMessageInfo(
    allMessageInfos,
    threadInfo,
  );
  const messageInfos = JSON.stringify(newRawMessageInfos);

  if (badgeOnly && codeVersion < 69) {
    // Older Android clients don't look at badgeOnly, so if we sent them the
    // full payload they would treat it as a normal notif. Instead we will
    // send them this payload that is missing an ID, which will prevent the
    // system notif from being generated, but still allow for in-app notifs
    // and badge updating.
    return {
      data: {
        badge: unreadCount.toString(),
        ...rest,
        threadID: threadInfo.id,
        messageInfos,
      },
    };
  } else if (codeVersion < 31) {
    return {
      data: {
        badge: unreadCount.toString(),
        custom_notification: JSON.stringify({
          channel: 'default',
          body: merged,
          badgeCount: unreadCount,
          id: notifID,
          priority: 'high',
          sound: 'default',
          icon: 'notif_icon',
          threadID: threadInfo.id,
          messageInfos,
          click_action: 'fcm.ACTION.HELLO',
        }),
      },
    };
  }

  return {
    data: {
      badge: unreadCount.toString(),
      ...rest,
      id: notifID,
      threadID: threadInfo.id,
      messageInfos,
      badgeOnly: badgeOnly ? '1' : '0',
    },
  };
}

type NotificationInfo =
  | {|
      +source: 'new_message',
      +dbID: string,
      +userID: string,
      +threadID: string,
      +messageID: string,
      +collapseKey: ?string,
      +codeVersion: number,
    |}
  | {|
      +source: 'mark_as_unread' | 'mark_as_read',
      +dbID: string,
      +userID: string,
      +codeVersion: number,
    |};

type IOSDelivery = {|
  source: $PropertyType<NotificationInfo, 'source'>,
  deviceType: 'ios',
  iosID: string,
  deviceTokens: $ReadOnlyArray<string>,
  codeVersion: number,
  errors?: $ReadOnlyArray<Object>,
|};
type IOSResult = {|
  info: NotificationInfo,
  delivery: IOSDelivery,
  invalidTokens?: $ReadOnlyArray<string>,
|};
async function sendIOSNotification(
  notification: apn.Notification,
  deviceTokens: $ReadOnlyArray<string>,
  notificationInfo: NotificationInfo,
): Promise<IOSResult> {
  const response = await apnPush(notification, deviceTokens);
  const delivery: IOSDelivery = {
    source: notificationInfo.source,
    deviceType: 'ios',
    iosID: notification.id,
    deviceTokens,
    codeVersion: notificationInfo.codeVersion,
  };
  if (response.errors) {
    delivery.errors = response.errors;
  }
  const result: IOSResult = {
    info: notificationInfo,
    delivery,
  };
  if (response.invalidTokens) {
    result.invalidTokens = response.invalidTokens;
  }
  return result;
}

type AndroidDelivery = {|
  source: $PropertyType<NotificationInfo, 'source'>,
  deviceType: 'android',
  androidIDs: $ReadOnlyArray<string>,
  deviceTokens: $ReadOnlyArray<string>,
  codeVersion: number,
  errors?: $ReadOnlyArray<Object>,
|};
type AndroidResult = {|
  info: NotificationInfo,
  delivery: AndroidDelivery,
  invalidTokens?: $ReadOnlyArray<string>,
|};
async function sendAndroidNotification(
  notification: Object,
  deviceTokens: $ReadOnlyArray<string>,
  notificationInfo: NotificationInfo,
): Promise<AndroidResult> {
  const collapseKey = notificationInfo.collapseKey
    ? notificationInfo.collapseKey
    : null; // for Flow...
  const response = await fcmPush(notification, deviceTokens, collapseKey);
  const androidIDs = response.fcmIDs ? response.fcmIDs : [];
  const delivery: AndroidDelivery = {
    source: notificationInfo.source,
    deviceType: 'android',
    androidIDs,
    deviceTokens,
    codeVersion: notificationInfo.codeVersion,
  };
  if (response.errors) {
    delivery.errors = response.errors;
  }
  const result: AndroidResult = {
    info: notificationInfo,
    delivery,
  };
  if (response.invalidTokens) {
    result.invalidTokens = response.invalidTokens;
  }
  return result;
}

type InvalidToken = {|
  +userID: string,
  +tokens: $ReadOnlyArray<string>,
|};
async function removeInvalidTokens(
  invalidTokens: $ReadOnlyArray<InvalidToken>,
): Promise<void> {
  const sqlTuples = invalidTokens.map(
    (invalidTokenUser) =>
      SQL`(
      user = ${invalidTokenUser.userID} AND
      device_token IN (${invalidTokenUser.tokens})
    )`,
  );
  const sqlCondition = mergeOrConditions(sqlTuples);

  const selectQuery = SQL`
    SELECT id, user, device_token
    FROM cookies
    WHERE
  `;
  selectQuery.append(sqlCondition);
  const [result] = await dbQuery(selectQuery);

  const userCookiePairsToInvalidDeviceTokens = new Map();
  for (let row of result) {
    const userCookiePair = `${row.user}|${row.id}`;
    const existing = userCookiePairsToInvalidDeviceTokens.get(userCookiePair);
    if (existing) {
      existing.add(row.device_token);
    } else {
      userCookiePairsToInvalidDeviceTokens.set(
        userCookiePair,
        new Set([row.device_token]),
      );
    }
  }

  const time = Date.now();
  const promises = [];
  for (let entry of userCookiePairsToInvalidDeviceTokens) {
    const [userCookiePair, deviceTokens] = entry;
    const [userID, cookieID] = userCookiePair.split('|');
    const updateDatas = [...deviceTokens].map((deviceToken) => ({
      type: updateTypes.BAD_DEVICE_TOKEN,
      userID,
      time,
      deviceToken,
      targetCookie: cookieID,
    }));
    promises.push(createUpdates(updateDatas));
  }

  const updateQuery = SQL`
    UPDATE cookies
    SET device_token = NULL
    WHERE
  `;
  updateQuery.append(sqlCondition);
  promises.push(dbQuery(updateQuery));

  await Promise.all(promises);
}

async function updateBadgeCount(
  viewer: Viewer,
  source: $PropertyType<NotificationInfo, 'source'>,
  excludeDeviceTokens: $ReadOnlyArray<string>,
) {
  const { userID } = viewer;

  const deviceTokenQuery = SQL`
    SELECT platform, device_token, versions
    FROM cookies
    WHERE user = ${userID}
      AND device_token IS NOT NULL
      AND id != ${viewer.cookieID}
  `;
  if (excludeDeviceTokens.length > 0) {
    deviceTokenQuery.append(
      SQL`AND device_token NOT IN (${excludeDeviceTokens})`,
    );
  }
  const [unreadCounts, [deviceTokenResult], [dbID]] = await Promise.all([
    getUnreadCounts([userID]),
    dbQuery(deviceTokenQuery),
    createIDs('notifications', 1),
  ]);
  const unreadCount = unreadCounts[userID];

  const devices = deviceTokenResult.map((row) => ({
    deviceType: row.platform,
    deviceToken: row.device_token,
    codeVersion: row.versions?.codeVersion,
  }));
  const byDeviceType = getDevicesByDeviceType(devices);

  const deliveryPromises = [];

  const iosVersionsToTokens = byDeviceType.get('ios');
  if (iosVersionsToTokens) {
    for (const [codeVer, deviceTokens] of iosVersionsToTokens) {
      const codeVersion = parseInt(codeVer, 10); // only for Flow
      const notification = new apn.Notification();
      notification.topic = 'org.squadcal.app';
      notification.badge = unreadCount;
      notification.pushType = 'alert';
      deliveryPromises.push(
        sendIOSNotification(notification, [...deviceTokens], {
          source: 'mark_as_unread',
          dbID,
          userID,
          codeVersion,
        }),
      );
    }
  }

  const androidVersionsToTokens = byDeviceType.get('android');
  if (androidVersionsToTokens) {
    for (const [codeVer, deviceTokens] of androidVersionsToTokens) {
      const codeVersion = parseInt(codeVer, 10); // only for Flow
      const notification = { data: { badge: unreadCount.toString() } };
      deliveryPromises.push(
        sendAndroidNotification(notification, [...deviceTokens], {
          source: 'mark_as_unread',
          dbID,
          userID,
          codeVersion,
        }),
      );
    }
  }

  const deliveryResults = await Promise.all(deliveryPromises);
  await saveNotifResults(deliveryResults, new Map(), false);
}

export { sendPushNotifs, updateBadgeCount };
