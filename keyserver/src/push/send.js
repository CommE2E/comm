// @flow

import apn from '@parse/node-apn';
import type { ResponseFailure } from '@parse/node-apn';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';
import _flow from 'lodash/fp/flow.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _pickBy from 'lodash/fp/pickBy.js';
import uuidv4 from 'uuid/v4.js';

import { oldValidUsernameRegex } from 'lib/shared/account-utils.js';
import { isMentioned } from 'lib/shared/mention-utils.js';
import {
  createMessageInfo,
  sortMessageInfoList,
  shimUnsupportedRawMessageInfos,
} from 'lib/shared/message-utils.js';
import { messageSpecs } from 'lib/shared/messages/message-specs.js';
import { notifTextsForMessageInfo } from 'lib/shared/notif-utils.js';
import {
  rawThreadInfoFromServerThreadInfo,
  threadInfoFromRawThreadInfo,
} from 'lib/shared/thread-utils.js';
import type { Platform, PlatformDetails } from 'lib/types/device-types.js';
import {
  type RawMessageInfo,
  type MessageInfo,
  type MessageData,
  messageTypes,
} from 'lib/types/message-types.js';
import type { WebNotification } from 'lib/types/notif-types.js';
import type { ServerThreadInfo, ThreadInfo } from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types.js';
import type { UserInfo } from 'lib/types/user-types.js';
import { promiseAll } from 'lib/utils/promises.js';

import { getAPNsNotificationTopic } from './providers.js';
import { rescindPushNotifs } from './rescind.js';
import {
  apnPush,
  fcmPush,
  getUnreadCounts,
  apnMaxNotificationPayloadByteSize,
  fcmMaxNotificationPayloadByteSize,
  webPush,
  type WebPushError,
} from './utils.js';
import createIDs from '../creators/id-creator.js';
import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, SQL, mergeOrConditions } from '../database/database.js';
import type { CollapsableNotifInfo } from '../fetchers/message-fetchers.js';
import { fetchCollapsableNotifs } from '../fetchers/message-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { fetchUserInfos } from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { getENSNames } from '../utils/ens-cache.js';

type Device = {
  +platform: Platform,
  +deviceToken: string,
  +codeVersion: ?number,
};
type PushUserInfo = {
  +devices: Device[],
  // messageInfos and messageDatas have the same key
  +messageInfos: RawMessageInfo[],
  +messageDatas: MessageData[],
};
type Delivery = PushDelivery | { collapsedInto: string };
type NotificationRow = {
  +dbID: string,
  +userID: string,
  +threadID?: ?string,
  +messageID?: ?string,
  +collapseKey?: ?string,
  +deliveries: Delivery[],
};
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
  for (const userID in usersToCollapsableNotifInfo) {
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
      _pickBy(threadInfo => threadInfo),
    )(serverThreadInfos);
    for (const notifInfo of usersToCollapsableNotifInfo[userID]) {
      const hydrateMessageInfo = (rawMessageInfo: RawMessageInfo) =>
        createMessageInfo(rawMessageInfo, userID, userInfos, threadInfos);
      const newMessageInfos = [];
      const newRawMessageInfos = [];
      for (const newRawMessageInfo of notifInfo.newMessageInfos) {
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
      const [firstNewMessageInfo, ...remainingNewMessageInfos] =
        newMessageInfos;
      const { threadID } = firstNewMessageInfo;

      const threadInfo = threadInfos[threadID];
      const updateBadge = threadInfo.currentUser.subscription.home;
      const displayBanner = threadInfo.currentUser.subscription.pushNotifs;
      const username = userInfos[userID] && userInfos[userID].username;
      const userWasMentioned =
        username &&
        threadInfo.currentUser.role &&
        oldValidUsernameRegex.test(username) &&
        newMessageInfos.some(newMessageInfo => {
          const unwrappedMessageInfo =
            newMessageInfo.type === messageTypes.SIDEBAR_SOURCE
              ? newMessageInfo.sourceMessage
              : newMessageInfo;
          return (
            unwrappedMessageInfo.type === messageTypes.TEXT &&
            isMentioned(username, unwrappedMessageInfo.text)
          );
        });
      if (!updateBadge && !displayBanner && !userWasMentioned) {
        continue;
      }
      const badgeOnly = !displayBanner && !userWasMentioned;

      const dbID = dbIDs.shift();
      invariant(dbID, 'should have sufficient DB IDs');
      const byPlatform = getDevicesByPlatform(pushInfo[userID].devices);
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

      const iosVersionsToTokens = byPlatform.get('ios');
      if (iosVersionsToTokens) {
        for (const [codeVer, deviceTokens] of iosVersionsToTokens) {
          const codeVersion = parseInt(codeVer, 10); // only for Flow
          const platformDetails = { platform: 'ios', codeVersion };
          const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            platformDetails,
          );
          const deliveryPromise = (async () => {
            const notification = await prepareAPNsNotification({
              allMessageInfos,
              newRawMessageInfos: shimmedNewRawMessageInfos,
              threadInfo,
              collapseKey: notifInfo.collapseKey,
              badgeOnly,
              unreadCount: unreadCounts[userID],
              platformDetails,
              notifTargetUserInfo: {
                id: userID,
                username,
              },
            });
            return await sendAPNsNotification(
              'ios',
              notification,
              [...deviceTokens],
              {
                ...notificationInfo,
                codeVersion,
              },
            );
          })();
          deliveryPromises.push(deliveryPromise);
        }
      }
      const androidVersionsToTokens = byPlatform.get('android');
      if (androidVersionsToTokens) {
        for (const [codeVer, deviceTokens] of androidVersionsToTokens) {
          const codeVersion = parseInt(codeVer, 10); // only for Flow
          const platformDetails = { platform: 'android', codeVersion };
          const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            platformDetails,
          );
          const deliveryPromise = (async () => {
            const notification = await prepareAndroidNotification({
              allMessageInfos,
              newRawMessageInfos: shimmedNewRawMessageInfos,
              threadInfo,
              collapseKey: notifInfo.collapseKey,
              badgeOnly,
              unreadCount: unreadCounts[userID],
              platformDetails,
              notifTargetUserInfo: {
                id: userID,
                username,
              },
              dbID,
            });
            return await sendAndroidNotification(
              notification,
              [...deviceTokens],
              {
                ...notificationInfo,
                codeVersion,
              },
            );
          })();
          deliveryPromises.push(deliveryPromise);
        }
      }
      const webVersionsToTokens = byPlatform.get('web');
      if (webVersionsToTokens) {
        for (const [codeVersion, deviceTokens] of webVersionsToTokens) {
          const deliveryPromise = (async () => {
            const notification = await prepareWebNotification({
              allMessageInfos,
              threadInfo,
              unreadCount: unreadCounts[userID],
              notifTargetUserInfo: {
                id: userID,
                username,
              },
            });
            return await sendWebNotification(notification, [...deviceTokens], {
              ...notificationInfo,
              codeVersion,
            });
          })();
          deliveryPromises.push(deliveryPromise);
        }
      }
      const macosVersionsToTokens = byPlatform.get('macos');
      if (macosVersionsToTokens) {
        for (const [codeVersion, deviceTokens] of macosVersionsToTokens) {
          const platformDetails = { platform: 'macos', codeVersion };
          const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
            newRawMessageInfos,
            platformDetails,
          );
          const deliveryPromise = (async () => {
            const notification = await prepareAPNsNotification({
              allMessageInfos,
              newRawMessageInfos: shimmedNewRawMessageInfos,
              threadInfo,
              collapseKey: notifInfo.collapseKey,
              badgeOnly,
              unreadCount: unreadCounts[userID],
              platformDetails,
              notifTargetUserInfo: {
                id: userID,
                username,
              },
            });
            return await sendAPNsNotification(
              'macos',
              notification,
              [...deviceTokens],
              {
                ...notificationInfo,
                codeVersion,
              },
            );
          })();
          deliveryPromises.push(deliveryPromise);
        }
      }

      for (const newMessageInfo of remainingNewMessageInfos) {
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

async function sendRescindNotifs(rescindInfo: PushInfo) {
  if (Object.keys(rescindInfo).length === 0) {
    return;
  }

  const usersToCollapsableNotifInfo = await fetchCollapsableNotifs(rescindInfo);

  const promises = [];
  for (const userID in usersToCollapsableNotifInfo) {
    for (const notifInfo of usersToCollapsableNotifInfo[userID]) {
      for (const existingMessageInfo of notifInfo.existingMessageInfos) {
        const rescindCondition = SQL`
          n.user = ${userID} AND
          n.thread = ${existingMessageInfo.threadID} AND
          n.message = ${existingMessageInfo.id}
        `;

        promises.push(rescindPushNotifs(rescindCondition));
      }
    }
  }

  await Promise.all(promises);
}

// The results in deliveryResults will be combined with the rows
// in rowsToSave and then written to the notifications table
async function saveNotifResults(
  deliveryResults: $ReadOnlyArray<PushResult>,
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
    const messageSpec = messageSpecs[rawMessageInfo.type];
    if (messageSpec.threadIDs) {
      for (const id of messageSpec.threadIDs(rawMessageInfo)) {
        threadIDs.add(id);
      }
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
  for (const userID in usersToCollapsableNotifInfo) {
    for (const notifInfo of usersToCollapsableNotifInfo[userID]) {
      for (const rawMessageInfo of notifInfo.existingMessageInfos) {
        addThreadIDsFromMessageInfos(rawMessageInfo);
      }
      for (const rawMessageInfo of notifInfo.newMessageInfos) {
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
    for (const [threadID, messages] of threadWithChangedNamesToMessages) {
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
    for (const row of result) {
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
  serverThreadInfos: { +[threadID: string]: ServerThreadInfo },
  usersToCollapsableNotifInfo: { +[userID: string]: CollapsableNotifInfo[] },
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
    const userIDs =
      messageSpecs[rawMessageInfo.type].userIDs?.(rawMessageInfo) ?? [];
    for (const userID of userIDs) {
      missingUserIDs.add(userID);
    }
  };

  for (const userID in usersToCollapsableNotifInfo) {
    missingUserIDs.add(userID);
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
  for (const userID in pushInfo) {
    numIDsNeeded += pushInfo[userID].messageInfos.length;
  }
  return await createIDs('notifications', numIDsNeeded);
}

function getDevicesByPlatform(
  devices: Device[],
): Map<Platform, Map<number, Set<string>>> {
  const byPlatform = new Map();
  for (const device of devices) {
    let innerMap = byPlatform.get(device.platform);
    if (!innerMap) {
      innerMap = new Map();
      byPlatform.set(device.platform, innerMap);
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
  return byPlatform;
}

type APNsNotifInputData = {
  +allMessageInfos: MessageInfo[],
  +newRawMessageInfos: RawMessageInfo[],
  +threadInfo: ThreadInfo,
  +collapseKey: ?string,
  +badgeOnly: boolean,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
  +notifTargetUserInfo: UserInfo,
};
async function prepareAPNsNotification(
  inputData: APNsNotifInputData,
): Promise<apn.Notification> {
  const {
    allMessageInfos,
    newRawMessageInfos,
    threadInfo,
    collapseKey,
    badgeOnly,
    unreadCount,
    platformDetails,
    notifTargetUserInfo,
  } = inputData;

  const uniqueID = uuidv4();
  const notification = new apn.Notification();
  notification.topic = getAPNsNotificationTopic(platformDetails);
  const { merged, ...rest } = await notifTextsForMessageInfo(
    allMessageInfos,
    threadInfo,
    notifTargetUserInfo,
    getENSNames,
  );

  // We don't include alert's body on macos because we
  // handle displaying the notification ourselves and
  // we don't want macOS to display it automatically.
  if (!badgeOnly && platformDetails.platform !== 'macos') {
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
  if (platformDetails.codeVersion && platformDetails.codeVersion > 1000) {
    notification.mutableContent = true;
  }
  if (collapseKey) {
    notification.collapseId = collapseKey;
  }
  const messageInfos = JSON.stringify(newRawMessageInfos);
  // We make a copy before checking notification's length, because calling
  // length compiles the notification and makes it immutable. Further
  // changes to its properties won't be reflected in the final plaintext
  // data that is sent.
  const copyWithMessageInfos = _cloneDeep(notification);
  copyWithMessageInfos.payload = {
    ...copyWithMessageInfos.payload,
    messageInfos,
  };
  if (copyWithMessageInfos.length() <= apnMaxNotificationPayloadByteSize) {
    notification.payload.messageInfos = messageInfos;
    return notification;
  }
  const notificationCopy = _cloneDeep(notification);
  if (notificationCopy.length() > apnMaxNotificationPayloadByteSize) {
    console.warn(
      `${platformDetails.platform} notification ${uniqueID} ` +
        `exceeds size limit, even with messageInfos omitted`,
    );
  }
  return notification;
}

type AndroidNotifInputData = {
  ...APNsNotifInputData,
  +dbID: string,
};
async function prepareAndroidNotification(
  inputData: AndroidNotifInputData,
): Promise<Object> {
  const {
    allMessageInfos,
    newRawMessageInfos,
    threadInfo,
    collapseKey,
    badgeOnly,
    unreadCount,
    platformDetails: { codeVersion },
    notifTargetUserInfo,
    dbID,
  } = inputData;

  const notifID = collapseKey ? collapseKey : dbID;
  const { merged, ...rest } = await notifTextsForMessageInfo(
    allMessageInfos,
    threadInfo,
    notifTargetUserInfo,
    getENSNames,
  );
  const notification = {
    data: {
      badge: unreadCount.toString(),
      ...rest,
      threadID: threadInfo.id,
    },
  };

  // The reason we only include `badgeOnly` for newer clients is because older
  // clients don't know how to parse it. The reason we only include `id` for
  // newer clients is that if the older clients see that field, they assume
  // the notif has a full payload, and then crash when trying to parse it.
  // By skipping `id` we allow old clients to still handle in-app notifs and
  // badge updating.
  if (!badgeOnly || (codeVersion && codeVersion >= 69)) {
    notification.data = {
      ...notification.data,
      id: notifID,
      badgeOnly: badgeOnly ? '1' : '0',
    };
  }

  const messageInfos = JSON.stringify(newRawMessageInfos);
  const copyWithMessageInfos = {
    ...notification,
    data: { ...notification.data, messageInfos },
  };

  if (
    Buffer.byteLength(JSON.stringify(copyWithMessageInfos)) <=
    fcmMaxNotificationPayloadByteSize
  ) {
    return copyWithMessageInfos;
  }

  if (
    Buffer.byteLength(JSON.stringify(notification)) >
    fcmMaxNotificationPayloadByteSize
  ) {
    console.warn(
      `Android notification ${notifID} exceeds size limit, even with messageInfos omitted`,
    );
  }
  return notification;
}

type WebNotifInputData = {
  +allMessageInfos: MessageInfo[],
  +threadInfo: ThreadInfo,
  +unreadCount: number,
  +notifTargetUserInfo: UserInfo,
};
async function prepareWebNotification(
  inputData: WebNotifInputData,
): Promise<WebNotification> {
  const { allMessageInfos, threadInfo, unreadCount, notifTargetUserInfo } =
    inputData;
  const id = uuidv4();
  const { merged, ...rest } = await notifTextsForMessageInfo(
    allMessageInfos,
    threadInfo,
    notifTargetUserInfo,
    getENSNames,
  );
  const notification = {
    ...rest,
    unreadCount,
    id,
    threadID: threadInfo.id,
  };
  return notification;
}

type NotificationInfo =
  | {
      +source: 'new_message',
      +dbID: string,
      +userID: string,
      +threadID: string,
      +messageID: string,
      +collapseKey: ?string,
      +codeVersion: number,
    }
  | {
      +source: 'mark_as_unread' | 'mark_as_read' | 'activity_update',
      +dbID: string,
      +userID: string,
      +codeVersion: number,
    };

type APNsDelivery = {
  source: $PropertyType<NotificationInfo, 'source'>,
  deviceType: 'ios' | 'macos',
  iosID: string,
  deviceTokens: $ReadOnlyArray<string>,
  codeVersion: number,
  errors?: $ReadOnlyArray<ResponseFailure>,
};
type APNsResult = {
  info: NotificationInfo,
  delivery: APNsDelivery,
  invalidTokens?: $ReadOnlyArray<string>,
};
async function sendAPNsNotification(
  platform: 'ios' | 'macos',
  notification: apn.Notification,
  deviceTokens: $ReadOnlyArray<string>,
  notificationInfo: NotificationInfo,
): Promise<APNsResult> {
  const { source, codeVersion } = notificationInfo;
  const response = await apnPush({
    notification,
    deviceTokens,
    platformDetails: { platform, codeVersion },
  });
  const delivery: APNsDelivery = {
    source,
    deviceType: platform,
    iosID: notification.id,
    deviceTokens,
    codeVersion,
  };
  if (response.errors) {
    delivery.errors = response.errors;
  }
  const result: APNsResult = {
    info: notificationInfo,
    delivery,
  };
  if (response.invalidTokens) {
    result.invalidTokens = response.invalidTokens;
  }
  return result;
}

type PushResult = AndroidResult | APNsResult | WebResult;
type PushDelivery = AndroidDelivery | APNsDelivery | WebDelivery;
type AndroidDelivery = {
  source: $PropertyType<NotificationInfo, 'source'>,
  deviceType: 'android',
  androidIDs: $ReadOnlyArray<string>,
  deviceTokens: $ReadOnlyArray<string>,
  codeVersion: number,
  errors?: $ReadOnlyArray<Object>,
};
type AndroidResult = {
  info: NotificationInfo,
  delivery: AndroidDelivery,
  invalidTokens?: $ReadOnlyArray<string>,
};
async function sendAndroidNotification(
  notification: Object,
  deviceTokens: $ReadOnlyArray<string>,
  notificationInfo: NotificationInfo,
): Promise<AndroidResult> {
  const collapseKey = notificationInfo.collapseKey
    ? notificationInfo.collapseKey
    : null; // for Flow...
  const { source, codeVersion } = notificationInfo;
  const response = await fcmPush({
    notification,
    deviceTokens,
    collapseKey,
    codeVersion,
  });
  const androidIDs = response.fcmIDs ? response.fcmIDs : [];
  const delivery: AndroidDelivery = {
    source,
    deviceType: 'android',
    androidIDs,
    deviceTokens,
    codeVersion,
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

type WebDelivery = {
  +source: $PropertyType<NotificationInfo, 'source'>,
  +deviceType: 'web',
  +deviceTokens: $ReadOnlyArray<string>,
  +codeVersion?: number,
  +errors?: $ReadOnlyArray<WebPushError>,
};
type WebResult = {
  +info: NotificationInfo,
  +delivery: WebDelivery,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function sendWebNotification(
  notification: WebNotification,
  deviceTokens: $ReadOnlyArray<string>,
  notificationInfo: NotificationInfo,
): Promise<WebResult> {
  const { source, codeVersion } = notificationInfo;

  const response = await webPush({
    notification,
    deviceTokens,
  });

  const delivery: WebDelivery = {
    source,
    deviceType: 'web',
    deviceTokens,
    codeVersion,
    errors: response.errors,
  };
  const result: WebResult = {
    info: notificationInfo,
    delivery,
    invalidTokens: response.invalidTokens,
  };
  return result;
}

type InvalidToken = {
  +userID: string,
  +tokens: $ReadOnlyArray<string>,
};
async function removeInvalidTokens(
  invalidTokens: $ReadOnlyArray<InvalidToken>,
): Promise<void> {
  const sqlTuples = invalidTokens.map(
    invalidTokenUser =>
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
  for (const row of result) {
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
  for (const entry of userCookiePairsToInvalidDeviceTokens) {
    const [userCookiePair, deviceTokens] = entry;
    const [userID, cookieID] = userCookiePair.split('|');
    const updateDatas = [...deviceTokens].map(deviceToken => ({
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
  source: 'mark_as_unread' | 'mark_as_read' | 'activity_update',
) {
  const { userID } = viewer;

  const deviceTokenQuery = SQL`
    SELECT platform, device_token, versions
    FROM cookies
    WHERE user = ${userID}
      AND device_token IS NOT NULL
  `;
  if (viewer.data.cookieID) {
    deviceTokenQuery.append(SQL`AND id != ${viewer.cookieID} `);
  }
  const [unreadCounts, [deviceTokenResult], [dbID]] = await Promise.all([
    getUnreadCounts([userID]),
    dbQuery(deviceTokenQuery),
    createIDs('notifications', 1),
  ]);
  const unreadCount = unreadCounts[userID];

  const devices = deviceTokenResult.map(row => ({
    platform: row.platform,
    deviceToken: row.device_token,
    codeVersion: JSON.parse(row.versions)?.codeVersion,
  }));
  const byPlatform = getDevicesByPlatform(devices);

  const deliveryPromises = [];

  const iosVersionsToTokens = byPlatform.get('ios');
  if (iosVersionsToTokens) {
    for (const [codeVer, deviceTokens] of iosVersionsToTokens) {
      const codeVersion = parseInt(codeVer, 10); // only for Flow
      const notification = new apn.Notification();
      notification.topic = getAPNsNotificationTopic({
        platform: 'ios',
        codeVersion,
      });
      notification.badge = unreadCount;
      notification.pushType = 'alert';
      deliveryPromises.push(
        sendAPNsNotification('ios', notification, [...deviceTokens], {
          source,
          dbID,
          userID,
          codeVersion,
        }),
      );
    }
  }

  const androidVersionsToTokens = byPlatform.get('android');
  if (androidVersionsToTokens) {
    for (const [codeVer, deviceTokens] of androidVersionsToTokens) {
      const codeVersion = parseInt(codeVer, 10); // only for Flow
      const notificationData =
        codeVersion < 69
          ? { badge: unreadCount.toString() }
          : { badge: unreadCount.toString(), badgeOnly: '1' };
      const notification = { data: notificationData };
      deliveryPromises.push(
        sendAndroidNotification(notification, [...deviceTokens], {
          source,
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

export { sendPushNotifs, sendRescindNotifs, updateBadgeCount };
