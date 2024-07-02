// @flow

import type { ResponseFailure } from '@parse/node-apn';
import apn from '@parse/node-apn';
import invariant from 'invariant';
import _cloneDeep from 'lodash/fp/cloneDeep.js';
import _flow from 'lodash/fp/flow.js';
import _groupBy from 'lodash/fp/groupBy.js';
import _mapValues from 'lodash/fp/mapValues.js';
import _pickBy from 'lodash/fp/pickBy.js';
import type { QueryResults } from 'mysql';
import t from 'tcomb';
import uuidv4 from 'uuid/v4.js';

import { oldValidUsernameRegex } from 'lib/shared/account-utils.js';
import { isUserMentioned } from 'lib/shared/mention-utils.js';
import {
  createMessageInfo,
  shimUnsupportedRawMessageInfos,
  sortMessageInfoList,
} from 'lib/shared/message-utils.js';
import { messageSpecs } from 'lib/shared/messages/message-specs.js';
import { notifTextsForMessageInfo } from 'lib/shared/notif-utils.js';
import {
  rawThreadInfoFromServerThreadInfo,
  threadInfoFromRawThreadInfo,
} from 'lib/shared/thread-utils.js';
import { hasMinCodeVersion } from 'lib/shared/version-utils.js';
import type { Platform, PlatformDetails } from 'lib/types/device-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type MessageData,
  type RawMessageInfo,
  rawMessageInfoValidator,
} from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ResolvedNotifTexts } from 'lib/types/notif-types.js';
import { resolvedNotifTextsValidator } from 'lib/types/notif-types.js';
import type { ServerThreadInfo } from 'lib/types/thread-types.js';
import { updateTypes } from 'lib/types/update-types-enum.js';
import { type GlobalUserInfo } from 'lib/types/user-types.js';
import { values } from 'lib/utils/objects.js';
import { tID, tPlatformDetails, tShape } from 'lib/utils/validation-utils.js';

import {
  prepareEncryptedAndroidVisualNotifications,
  prepareEncryptedAndroidSilentNotifications,
  prepareEncryptedAPNsNotifications,
  prepareEncryptedWebNotifications,
  prepareEncryptedWNSNotifications,
} from './crypto.js';
import { getAPNsNotificationTopic } from './providers.js';
import { rescindPushNotifs } from './rescind.js';
import type {
  AndroidVisualNotification,
  NotificationTargetDevice,
  TargetedAndroidNotification,
  TargetedAPNsNotification,
  TargetedWebNotification,
  TargetedWNSNotification,
} from './types.js';
import {
  apnMaxNotificationPayloadByteSize,
  apnPush,
  fcmMaxNotificationPayloadByteSize,
  fcmPush,
  getUnreadCounts,
  webPush,
  type WebPushError,
  wnsMaxNotificationPayloadByteSize,
  wnsPush,
  type WNSPushError,
  blobServiceUpload,
} from './utils.js';
import createIDs from '../creators/id-creator.js';
import { createUpdates } from '../creators/update-creator.js';
import { dbQuery, mergeOrConditions, SQL } from '../database/database.js';
import type { CollapsableNotifInfo } from '../fetchers/message-fetchers.js';
import { fetchCollapsableNotifs } from '../fetchers/message-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { fetchUserInfos } from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import { thisKeyserverID } from '../user/identity.js';
import { getENSNames } from '../utils/ens-cache.js';
import { getFCNames } from '../utils/fc-cache.js';
import { validateOutput } from '../utils/validation-utils.js';

export type Device = {
  +platform: Platform,
  +deviceToken: string,
  +cookieID: string,
  +codeVersion: ?number,
  +stateVersion: ?number,
  +majorDesktopVersion: ?number,
};

export type PushUserInfo = {
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

  const keyserverID = await thisKeyserverID();

  const [
    unreadCounts,
    { usersToCollapsableNotifInfo, serverThreadInfos, userInfos },
    dbIDs,
  ] = await Promise.all([
    getUnreadCounts(Object.keys(pushInfo)),
    fetchInfos(pushInfo),
    createDBIDs(pushInfo),
  ]);

  const preparePromises: Array<Promise<?$ReadOnlyArray<PreparePushResult>>> =
    [];
  const notifications: Map<string, NotificationRow> = new Map();
  for (const userID in usersToCollapsableNotifInfo) {
    const threadInfos = _flow(
      _mapValues((serverThreadInfo: ServerThreadInfo) => {
        const rawThreadInfo = rawThreadInfoFromServerThreadInfo(
          serverThreadInfo,
          userID,
          { minimallyEncodePermissions: true },
        );
        if (!rawThreadInfo) {
          return null;
        }
        invariant(
          rawThreadInfo.minimallyEncoded,
          'rawThreadInfo from rawThreadInfoFromServerThreadInfo must be ' +
            'minimallyEncoded when minimallyEncodePermissions option is set',
        );
        return threadInfoFromRawThreadInfo(rawThreadInfo, userID, userInfos);
      }),
      _pickBy(threadInfo => threadInfo),
    )(serverThreadInfos);
    for (const notifInfo of usersToCollapsableNotifInfo[userID]) {
      preparePromises.push(
        preparePushNotif({
          keyserverID,
          notifInfo,
          userID,
          pushUserInfo: pushInfo[userID],
          unreadCount: unreadCounts[userID],
          threadInfos,
          userInfos,
          dbIDs,
          rowsToSave: notifications,
        }),
      );
    }
  }

  const prepareResults = await Promise.all(preparePromises);
  const flattenedPrepareResults = prepareResults.filter(Boolean).flat();

  const deliveryResults = await deliverPushNotifsInEncryptionOrder(
    flattenedPrepareResults,
  );
  const cleanUpPromise = (async () => {
    if (dbIDs.length === 0) {
      return;
    }
    const query = SQL`DELETE FROM ids WHERE id IN (${dbIDs})`;
    await dbQuery(query);
  })();

  await Promise.all([
    cleanUpPromise,
    saveNotifResults(deliveryResults, notifications, true),
  ]);
}

type PreparePushResult = {
  +platform: Platform,
  +notificationInfo: NotificationInfo,
  +notification:
    | TargetedAPNsNotification
    | TargetedAndroidNotification
    | TargetedWebNotification
    | TargetedWNSNotification,
};

async function preparePushNotif(input: {
  keyserverID: string,
  notifInfo: CollapsableNotifInfo,
  userID: string,
  pushUserInfo: PushUserInfo,
  unreadCount: number,
  threadInfos: {
    +[threadID: string]: ThreadInfo,
  },
  userInfos: { +[userID: string]: GlobalUserInfo },
  dbIDs: string[], // mutable
  rowsToSave: Map<string, NotificationRow>, // mutable
}): Promise<?$ReadOnlyArray<PreparePushResult>> {
  const {
    keyserverID,
    notifInfo,
    userID,
    pushUserInfo,
    unreadCount,
    threadInfos,
    userInfos,
    dbIDs,
    rowsToSave,
  } = input;

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
    return null;
  }
  const existingMessageInfos = notifInfo.existingMessageInfos
    .map(hydrateMessageInfo)
    .filter(Boolean);
  const allMessageInfos = sortMessageInfoList([
    ...newMessageInfos,
    ...existingMessageInfos,
  ]);
  const [firstNewMessageInfo, ...remainingNewMessageInfos] = newMessageInfos;
  const { threadID } = firstNewMessageInfo;

  const threadInfo = threadInfos[threadID];
  const parentThreadInfo = threadInfo.parentThreadID
    ? threadInfos[threadInfo.parentThreadID]
    : null;
  const updateBadge = threadInfo.currentUser.subscription.home;
  const displayBanner = threadInfo.currentUser.subscription.pushNotifs;
  const username = userInfos[userID] && userInfos[userID].username;

  let resolvedUsername;
  if (getENSNames) {
    const userInfosWithENSNames = await getENSNames([userInfos[userID]]);
    resolvedUsername = userInfosWithENSNames[0].username;
  }

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
        (isUserMentioned(username, unwrappedMessageInfo.text) ||
          (resolvedUsername &&
            isUserMentioned(resolvedUsername, unwrappedMessageInfo.text)))
      );
    });
  if (!updateBadge && !displayBanner && !userWasMentioned) {
    return null;
  }
  const badgeOnly = !displayBanner && !userWasMentioned;

  const notifTargetUserInfo = { id: userID, username };
  const notifTexts = await notifTextsForMessageInfo(
    allMessageInfos,
    threadInfo,
    parentThreadInfo,
    notifTargetUserInfo,
    getENSNames,
    getFCNames,
  );
  if (!notifTexts) {
    return null;
  }

  const dbID = dbIDs.shift();
  invariant(dbID, 'should have sufficient DB IDs');
  const byPlatform = getDevicesByPlatform(pushUserInfo.devices);
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

  const preparePromises: Array<Promise<$ReadOnlyArray<PreparePushResult>>> = [];

  const iosVersionsToTokens = byPlatform.get('ios');
  if (iosVersionsToTokens) {
    for (const [versionKey, devices] of iosVersionsToTokens) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);

      const platformDetails: PlatformDetails = {
        platform: 'ios',
        codeVersion,
        stateVersion,
      };
      const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
        newRawMessageInfos,
        platformDetails,
      );
      const preparePromise: Promise<$ReadOnlyArray<PreparePushResult>> =
        (async () => {
          const targetedNotifications = await prepareAPNsNotification(
            {
              keyserverID,
              notifTexts,
              newRawMessageInfos: shimmedNewRawMessageInfos,
              threadID: threadInfo.id,
              collapseKey: notifInfo.collapseKey,
              badgeOnly,
              unreadCount,
              platformDetails,
            },
            devices,
          );
          return targetedNotifications.map(notification => ({
            notification,
            platform: 'ios',
            notificationInfo: {
              ...notificationInfo,
              codeVersion,
              stateVersion,
            },
          }));
        })();
      preparePromises.push(preparePromise);
    }
  }
  const androidVersionsToTokens = byPlatform.get('android');
  if (androidVersionsToTokens) {
    for (const [versionKey, devices] of androidVersionsToTokens) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'android',
        codeVersion,
        stateVersion,
      };
      const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
        newRawMessageInfos,
        platformDetails,
      );
      const preparePromise: Promise<$ReadOnlyArray<PreparePushResult>> =
        (async () => {
          const targetedNotifications = await prepareAndroidVisualNotification(
            {
              keyserverID,
              notifTexts,
              newRawMessageInfos: shimmedNewRawMessageInfos,
              threadID: threadInfo.id,
              collapseKey: notifInfo.collapseKey,
              badgeOnly,
              unreadCount,
              platformDetails,
              dbID,
            },
            devices,
          );
          return targetedNotifications.map(notification => ({
            notification,
            platform: 'android',
            notificationInfo: {
              ...notificationInfo,
              codeVersion,
              stateVersion,
            },
          }));
        })();
      preparePromises.push(preparePromise);
    }
  }
  const webVersionsToTokens = byPlatform.get('web');
  if (webVersionsToTokens) {
    for (const [versionKey, devices] of webVersionsToTokens) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'web',
        codeVersion,
        stateVersion,
      };

      const preparePromise: Promise<$ReadOnlyArray<PreparePushResult>> =
        (async () => {
          const targetedNotifications = await prepareWebNotification(
            {
              notifTexts,
              threadID: threadInfo.id,
              keyserverID,
              unreadCount,
              platformDetails,
            },
            devices,
          );

          return targetedNotifications.map(notification => ({
            notification,
            platform: 'web',
            notificationInfo: {
              ...notificationInfo,
              codeVersion,
              stateVersion,
            },
          }));
        })();
      preparePromises.push(preparePromise);
    }
  }
  const macosVersionsToTokens = byPlatform.get('macos');
  if (macosVersionsToTokens) {
    for (const [versionKey, devices] of macosVersionsToTokens) {
      const { codeVersion, stateVersion, majorDesktopVersion } =
        stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'macos',
        codeVersion,
        stateVersion,
        majorDesktopVersion,
      };
      const shimmedNewRawMessageInfos = shimUnsupportedRawMessageInfos(
        newRawMessageInfos,
        platformDetails,
      );
      const preparePromise: Promise<$ReadOnlyArray<PreparePushResult>> =
        (async () => {
          const targetedNotifications = await prepareAPNsNotification(
            {
              keyserverID,
              notifTexts,
              newRawMessageInfos: shimmedNewRawMessageInfos,
              threadID: threadInfo.id,
              collapseKey: notifInfo.collapseKey,
              badgeOnly,
              unreadCount,
              platformDetails,
            },
            devices,
          );
          return targetedNotifications.map(notification => ({
            notification,
            platform: 'macos',
            notificationInfo: {
              ...notificationInfo,
              codeVersion,
              stateVersion,
            },
          }));
        })();
      preparePromises.push(preparePromise);
    }
  }
  const windowsVersionsToTokens = byPlatform.get('windows');
  if (windowsVersionsToTokens) {
    for (const [versionKey, devices] of windowsVersionsToTokens) {
      const { codeVersion, stateVersion, majorDesktopVersion } =
        stringToVersionKey(versionKey);
      const platformDetails = {
        platform: 'windows',
        codeVersion,
        stateVersion,
        majorDesktopVersion,
      };

      const preparePromise: Promise<$ReadOnlyArray<PreparePushResult>> =
        (async () => {
          const targetedNotifications = await prepareWNSNotification(devices, {
            notifTexts,
            threadID: threadInfo.id,
            keyserverID,
            unreadCount,
            platformDetails,
          });

          return targetedNotifications.map(notification => ({
            notification,
            platform: 'windows',
            notificationInfo: {
              ...notificationInfo,
              codeVersion,
              stateVersion,
            },
          }));
        })();
      preparePromises.push(preparePromise);
    }
  }

  for (const newMessageInfo of remainingNewMessageInfos) {
    const newDBID = dbIDs.shift();
    invariant(newDBID, 'should have sufficient DB IDs');
    const messageID = newMessageInfo.id;
    invariant(messageID, 'RawMessageInfo.id should be set on server');
    rowsToSave.set(newDBID, {
      dbID: newDBID,
      userID,
      threadID: newMessageInfo.threadID,
      messageID,
      collapseKey: notifInfo.collapseKey,
      deliveries: [{ collapsedInto: dbID }],
    });
  }

  const prepareResults = await Promise.all(preparePromises);
  return prepareResults.flat();
}

// For better readability we don't differentiate between
// encrypted and unencrypted notifs and order them together
function compareEncryptionOrder(
  pushNotif1: PreparePushResult,
  pushNotif2: PreparePushResult,
): number {
  const order1 = pushNotif1.notification.encryptionOrder ?? 0;
  const order2 = pushNotif2.notification.encryptionOrder ?? 0;
  return order1 - order2;
}

async function deliverPushNotifsInEncryptionOrder(
  preparedPushNotifs: $ReadOnlyArray<PreparePushResult>,
): Promise<$ReadOnlyArray<PushResult>> {
  const deliveryPromises: Array<Promise<$ReadOnlyArray<PushResult>>> = [];

  const groupedByDevice = _groupBy(
    preparedPushNotif => preparedPushNotif.deviceToken,
  )(preparedPushNotifs);

  for (const preparedPushNotifsForDevice of values(groupedByDevice)) {
    const orderedPushNotifsForDevice = preparedPushNotifsForDevice.sort(
      compareEncryptionOrder,
    );

    const deviceDeliveryPromise = (async () => {
      const deliveries = [];
      for (const preparedPushNotif of orderedPushNotifsForDevice) {
        const { platform, notification, notificationInfo } = preparedPushNotif;
        let delivery: PushResult;
        if (platform === 'ios' || platform === 'macos') {
          delivery = await sendAPNsNotification(
            platform,
            [notification],
            notificationInfo,
          );
        } else if (platform === 'android') {
          delivery = await sendAndroidNotification(
            [notification],
            notificationInfo,
          );
        } else if (platform === 'web') {
          delivery = await sendWebNotifications(
            [notification],
            notificationInfo,
          );
        } else if (platform === 'windows') {
          delivery = await sendWNSNotification(
            [notification],
            notificationInfo,
          );
        }
        if (delivery) {
          deliveries.push(delivery);
        }
      }
      return deliveries;
    })();
    deliveryPromises.push(deviceDeliveryPromise);
  }

  const deliveryResults = await Promise.all(deliveryPromises);
  return deliveryResults.flat();
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

  const dbPromises: Array<Promise<mixed>> = [];
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

  const threadIDs = new Set<string>();
  const threadWithChangedNamesToMessages = new Map<string, Array<string>>();
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

  // These threadInfos won't have currentUser set
  const threadPromise = fetchServerThreadInfos({ threadIDs });

  const oldNamesPromise: Promise<?QueryResults> = (async () => {
    if (threadWithChangedNamesToMessages.size === 0) {
      return undefined;
    }
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
    return await dbQuery(oldNameQuery);
  })();

  const [threadResult, oldNames] = await Promise.all([
    threadPromise,
    oldNamesPromise,
  ]);
  const serverThreadInfos = { ...threadResult.threadInfos };
  if (oldNames) {
    const [result] = oldNames;
    for (const row of result) {
      const threadID = row.thread.toString();
      serverThreadInfos[threadID] = {
        ...serverThreadInfos[threadID],
        name: row.name,
      };
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
  const missingUserIDs = new Set<string>();

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

type VersionKey = {
  +codeVersion: number,
  +stateVersion: number,
  +majorDesktopVersion?: number,
};
const versionKeyRegex: RegExp = new RegExp(/^-?\d+\|-?\d+(\|-?\d+)?$/);
function versionKeyToString(versionKey: VersionKey): string {
  const baseStringVersionKey = `${versionKey.codeVersion}|${versionKey.stateVersion}`;
  if (!versionKey.majorDesktopVersion) {
    return baseStringVersionKey;
  }
  return `${baseStringVersionKey}|${versionKey.majorDesktopVersion}`;
}

function stringToVersionKey(versionKeyString: string): VersionKey {
  invariant(
    versionKeyRegex.test(versionKeyString),
    'should pass correct version key string',
  );
  const [codeVersion, stateVersion, majorDesktopVersion] = versionKeyString
    .split('|')
    .map(Number);
  return { codeVersion, stateVersion, majorDesktopVersion };
}

function getDevicesByPlatform(
  devices: $ReadOnlyArray<Device>,
): Map<Platform, Map<string, Array<NotificationTargetDevice>>> {
  const byPlatform = new Map<
    Platform,
    Map<string, Array<NotificationTargetDevice>>,
  >();
  for (const device of devices) {
    let innerMap = byPlatform.get(device.platform);
    if (!innerMap) {
      innerMap = new Map<string, Array<NotificationTargetDevice>>();
      byPlatform.set(device.platform, innerMap);
    }
    const codeVersion: number =
      device.codeVersion !== null && device.codeVersion !== undefined
        ? device.codeVersion
        : -1;
    const stateVersion: number = device.stateVersion ?? -1;

    let versionsObject = { codeVersion, stateVersion };
    if (device.majorDesktopVersion) {
      versionsObject = {
        ...versionsObject,
        majorDesktopVersion: device.majorDesktopVersion,
      };
    }

    const versionKey = versionKeyToString(versionsObject);
    let innerMostArrayTmp: ?Array<NotificationTargetDevice> =
      innerMap.get(versionKey);
    if (!innerMostArrayTmp) {
      innerMostArrayTmp = [];
      innerMap.set(versionKey, innerMostArrayTmp);
    }
    const innerMostArray = innerMostArrayTmp;

    innerMostArray.push({
      cookieID: device.cookieID,
      deviceToken: device.deviceToken,
    });
  }
  return byPlatform;
}

type CommonNativeNotifInputData = {
  +keyserverID: string,
  +notifTexts: ResolvedNotifTexts,
  +newRawMessageInfos: RawMessageInfo[],
  +threadID: string,
  +collapseKey: ?string,
  +badgeOnly: boolean,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
};

const commonNativeNotifInputDataValidator = tShape<CommonNativeNotifInputData>({
  keyserverID: t.String,
  notifTexts: resolvedNotifTextsValidator,
  newRawMessageInfos: t.list(rawMessageInfoValidator),
  threadID: tID,
  collapseKey: t.maybe(t.String),
  badgeOnly: t.Boolean,
  unreadCount: t.Number,
  platformDetails: tPlatformDetails,
});

async function prepareAPNsNotification(
  inputData: CommonNativeNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAPNsNotification>> {
  const convertedData = await validateOutput(
    inputData.platformDetails,
    commonNativeNotifInputDataValidator,
    inputData,
  );
  const {
    keyserverID,
    notifTexts,
    newRawMessageInfos,
    threadID,
    collapseKey,
    badgeOnly,
    unreadCount,
    platformDetails,
  } = convertedData;

  const canDecryptNonCollapsibleTextIOSNotifs =
    platformDetails.codeVersion && platformDetails.codeVersion > 222;

  const isNonCollapsibleTextNotification =
    newRawMessageInfos.every(
      newRawMessageInfo => newRawMessageInfo.type === messageTypes.TEXT,
    ) && !collapseKey;

  const canDecryptAllIOSNotifs =
    platformDetails.codeVersion && platformDetails.codeVersion >= 267;

  const canDecryptIOSNotif =
    platformDetails.platform === 'ios' &&
    (canDecryptAllIOSNotifs ||
      (isNonCollapsibleTextNotification &&
        canDecryptNonCollapsibleTextIOSNotifs));

  const canDecryptMacOSNotifs =
    platformDetails.platform === 'macos' &&
    hasMinCodeVersion(platformDetails, {
      web: 47,
      majorDesktop: 9,
    });

  const shouldBeEncrypted = canDecryptIOSNotif || canDecryptMacOSNotifs;

  const uniqueID = uuidv4();
  const notification = new apn.Notification();
  notification.topic = getAPNsNotificationTopic(platformDetails);

  const { merged, ...rest } = notifTexts;
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
  notification.threadId = threadID;
  notification.id = uniqueID;
  notification.pushType = 'alert';
  notification.payload.id = uniqueID;
  notification.payload.threadID = threadID;
  notification.payload.keyserverID = keyserverID;

  if (platformDetails.codeVersion && platformDetails.codeVersion > 198) {
    notification.mutableContent = true;
  }
  if (collapseKey && (canDecryptAllIOSNotifs || canDecryptMacOSNotifs)) {
    notification.payload.collapseID = collapseKey;
  } else if (collapseKey) {
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

  const notificationSizeValidator = (notif: apn.Notification) =>
    notif.length() <= apnMaxNotificationPayloadByteSize;

  if (!shouldBeEncrypted) {
    const notificationToSend = notificationSizeValidator(
      _cloneDeep(copyWithMessageInfos),
    )
      ? copyWithMessageInfos
      : notification;
    return devices.map(({ deviceToken }) => ({
      notification: notificationToSend,
      deviceToken,
    }));
  }

  // The `messageInfos` field in notification payload is
  // not used on MacOS so we can return early.
  if (platformDetails.platform === 'macos') {
    const macOSNotifsWithoutMessageInfos =
      await prepareEncryptedAPNsNotifications(
        devices,
        notification,
        platformDetails.codeVersion,
      );
    return macOSNotifsWithoutMessageInfos.map(
      ({ notification: notif, deviceToken }) => ({
        notification: notif,
        deviceToken,
      }),
    );
  }

  const notifsWithMessageInfos = await prepareEncryptedAPNsNotifications(
    devices,
    copyWithMessageInfos,
    platformDetails.codeVersion,
    notificationSizeValidator,
  );

  const devicesWithExcessiveSizeNoHolders = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => payloadSizeExceeded)
    .map(({ deviceToken, cookieID }) => ({ deviceToken, cookieID }));

  if (devicesWithExcessiveSizeNoHolders.length === 0) {
    return notifsWithMessageInfos.map(
      ({
        notification: notif,
        deviceToken,
        encryptedPayloadHash,
        encryptionOrder,
      }) => ({
        notification: notif,
        deviceToken,
        encryptedPayloadHash,
        encryptionOrder,
      }),
    );
  }

  const canQueryBlobService = hasMinCodeVersion(platformDetails, {
    native: 331,
  });

  let blobHash, blobHolders, encryptionKey, blobUploadError;
  if (canQueryBlobService) {
    ({ blobHash, blobHolders, encryptionKey, blobUploadError } =
      await blobServiceUpload(
        copyWithMessageInfos.compile(),
        devicesWithExcessiveSizeNoHolders.length,
      ));
  }

  if (blobUploadError) {
    console.warn(
      `Failed to upload payload of notification: ${uniqueID} ` +
        `due to error: ${blobUploadError}`,
    );
  }

  let devicesWithExcessiveSize = devicesWithExcessiveSizeNoHolders;
  if (
    blobHash &&
    encryptionKey &&
    blobHolders &&
    blobHolders.length === devicesWithExcessiveSize.length
  ) {
    notification.payload = {
      ...notification.payload,
      blobHash,
      encryptionKey,
    };

    devicesWithExcessiveSize = blobHolders.map((holder, idx) => ({
      ...devicesWithExcessiveSize[idx],
      blobHolder: holder,
    }));
  }

  const notifsWithoutMessageInfos = await prepareEncryptedAPNsNotifications(
    devicesWithExcessiveSize,
    notification,
    platformDetails.codeVersion,
  );

  const targetedNotifsWithMessageInfos = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => !payloadSizeExceeded)
    .map(
      ({
        notification: notif,
        deviceToken,
        encryptedPayloadHash,
        encryptionOrder,
      }) => ({
        notification: notif,
        deviceToken,
        encryptedPayloadHash,
        encryptionOrder,
      }),
    );

  const targetedNotifsWithoutMessageInfos = notifsWithoutMessageInfos.map(
    ({
      notification: notif,
      deviceToken,
      encryptedPayloadHash,
      encryptionOrder,
    }) => ({
      notification: notif,
      deviceToken,
      encryptedPayloadHash,
      encryptionOrder,
    }),
  );

  return [
    ...targetedNotifsWithMessageInfos,
    ...targetedNotifsWithoutMessageInfos,
  ];
}

type AndroidNotifInputData = {
  ...CommonNativeNotifInputData,
  +dbID: string,
};
const androidNotifInputDataValidator = tShape<AndroidNotifInputData>({
  ...commonNativeNotifInputDataValidator.meta.props,
  dbID: t.String,
});
async function prepareAndroidVisualNotification(
  inputData: AndroidNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedAndroidNotification>> {
  const convertedData = await validateOutput(
    inputData.platformDetails,
    androidNotifInputDataValidator,
    inputData,
  );
  const {
    keyserverID,
    notifTexts,
    newRawMessageInfos,
    threadID,
    collapseKey,
    badgeOnly,
    unreadCount,
    platformDetails,
    dbID,
  } = convertedData;

  const canDecryptNonCollapsibleTextNotifs = hasMinCodeVersion(
    platformDetails,
    { native: 228 },
  );
  const isNonCollapsibleTextNotif =
    newRawMessageInfos.every(
      newRawMessageInfo => newRawMessageInfo.type === messageTypes.TEXT,
    ) && !collapseKey;

  const canDecryptAllNotifTypes = hasMinCodeVersion(platformDetails, {
    native: 267,
  });

  const shouldBeEncrypted =
    canDecryptAllNotifTypes ||
    (canDecryptNonCollapsibleTextNotifs && isNonCollapsibleTextNotif);

  const { merged, ...rest } = notifTexts;
  const notification = {
    data: {
      keyserverID,
      badge: unreadCount.toString(),
      ...rest,
      threadID,
    },
  };

  let notifID;
  if (collapseKey && canDecryptAllNotifTypes) {
    notifID = dbID;
    notification.data = {
      ...notification.data,
      collapseKey,
    };
  } else if (collapseKey) {
    notifID = collapseKey;
  } else {
    notifID = dbID;
  }

  notification.data = {
    ...notification.data,
    id: notifID,
    badgeOnly: badgeOnly ? '1' : '0',
  };

  const messageInfos = JSON.stringify(newRawMessageInfos);
  const copyWithMessageInfos = {
    ...notification,
    data: { ...notification.data, messageInfos },
  };

  const priority = 'high';
  if (!shouldBeEncrypted) {
    const notificationToSend =
      Buffer.byteLength(JSON.stringify(copyWithMessageInfos)) <=
      fcmMaxNotificationPayloadByteSize
        ? copyWithMessageInfos
        : notification;

    return devices.map(({ deviceToken }) => ({
      priority,
      notification: notificationToSend,
      deviceToken,
    }));
  }

  const notificationsSizeValidator = (notif: AndroidVisualNotification) => {
    const serializedNotif = JSON.stringify(notif);
    return (
      !serializedNotif ||
      Buffer.byteLength(serializedNotif) <= fcmMaxNotificationPayloadByteSize
    );
  };

  const notifsWithMessageInfos =
    await prepareEncryptedAndroidVisualNotifications(
      devices,
      copyWithMessageInfos,
      notificationsSizeValidator,
    );

  const devicesWithExcessiveSizeNoHolders = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => payloadSizeExceeded)
    .map(({ cookieID, deviceToken }) => ({ cookieID, deviceToken }));

  if (devicesWithExcessiveSizeNoHolders.length === 0) {
    return notifsWithMessageInfos.map(
      ({ notification: notif, deviceToken, encryptionOrder }) => ({
        priority,
        notification: notif,
        deviceToken,
        encryptionOrder,
      }),
    );
  }

  const canQueryBlobService = hasMinCodeVersion(platformDetails, {
    native: 331,
  });

  let blobHash, blobHolders, encryptionKey, blobUploadError;
  if (canQueryBlobService) {
    ({ blobHash, blobHolders, encryptionKey, blobUploadError } =
      await blobServiceUpload(
        JSON.stringify(copyWithMessageInfos.data),
        devicesWithExcessiveSizeNoHolders.length,
      ));
  }

  if (blobUploadError) {
    console.warn(
      `Failed to upload payload of notification: ${notifID} ` +
        `due to error: ${blobUploadError}`,
    );
  }

  let devicesWithExcessiveSize = devicesWithExcessiveSizeNoHolders;
  if (
    blobHash &&
    encryptionKey &&
    blobHolders &&
    blobHolders.length === devicesWithExcessiveSizeNoHolders.length
  ) {
    notification.data = {
      ...notification.data,
      blobHash,
      encryptionKey,
    };

    devicesWithExcessiveSize = blobHolders.map((holder, idx) => ({
      ...devicesWithExcessiveSize[idx],
      blobHolder: holder,
    }));
  }

  const notifsWithoutMessageInfos =
    await prepareEncryptedAndroidVisualNotifications(
      devicesWithExcessiveSize,
      notification,
    );

  const targetedNotifsWithMessageInfos = notifsWithMessageInfos
    .filter(({ payloadSizeExceeded }) => !payloadSizeExceeded)
    .map(({ notification: notif, deviceToken, encryptionOrder }) => ({
      priority,
      notification: notif,
      deviceToken,
      encryptionOrder,
    }));

  const targetedNotifsWithoutMessageInfos = notifsWithoutMessageInfos.map(
    ({ notification: notif, deviceToken, encryptionOrder }) => ({
      priority,
      notification: notif,
      deviceToken,
      encryptionOrder,
    }),
  );

  return [
    ...targetedNotifsWithMessageInfos,
    ...targetedNotifsWithoutMessageInfos,
  ];
}

type WebNotifInputData = {
  +notifTexts: ResolvedNotifTexts,
  +threadID: string,
  +keyserverID: string,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
};
const webNotifInputDataValidator = tShape<WebNotifInputData>({
  notifTexts: resolvedNotifTextsValidator,
  threadID: tID,
  keyserverID: t.String,
  unreadCount: t.Number,
  platformDetails: tPlatformDetails,
});
async function prepareWebNotification(
  inputData: WebNotifInputData,
  devices: $ReadOnlyArray<NotificationTargetDevice>,
): Promise<$ReadOnlyArray<TargetedWebNotification>> {
  const convertedData = await validateOutput(
    inputData.platformDetails,
    webNotifInputDataValidator,
    inputData,
  );
  const { notifTexts, threadID, unreadCount, keyserverID } = convertedData;
  const id = uuidv4();
  const { merged, ...rest } = notifTexts;
  const notification = {
    ...rest,
    unreadCount,
    id,
    threadID,
    keyserverID,
  };

  const shouldBeEncrypted = hasMinCodeVersion(convertedData.platformDetails, {
    web: 43,
  });

  if (!shouldBeEncrypted) {
    return devices.map(({ deviceToken }) => ({ deviceToken, notification }));
  }

  return prepareEncryptedWebNotifications(devices, notification);
}

type WNSNotifInputData = {
  +notifTexts: ResolvedNotifTexts,
  +threadID: string,
  +keyserverID: string,
  +unreadCount: number,
  +platformDetails: PlatformDetails,
};
const wnsNotifInputDataValidator = tShape<WNSNotifInputData>({
  notifTexts: resolvedNotifTextsValidator,
  threadID: tID,
  keyserverID: t.String,
  unreadCount: t.Number,
  platformDetails: tPlatformDetails,
});
async function prepareWNSNotification(
  devices: $ReadOnlyArray<NotificationTargetDevice>,
  inputData: WNSNotifInputData,
): Promise<$ReadOnlyArray<TargetedWNSNotification>> {
  const convertedData = await validateOutput(
    inputData.platformDetails,
    wnsNotifInputDataValidator,
    inputData,
  );
  const { notifTexts, threadID, unreadCount, keyserverID } = convertedData;
  const { merged, ...rest } = notifTexts;
  const notification = {
    ...rest,
    unreadCount,
    threadID,
    keyserverID,
  };

  if (
    Buffer.byteLength(JSON.stringify(notification)) >
    wnsMaxNotificationPayloadByteSize
  ) {
    console.warn('WNS notification exceeds size limit');
  }

  const shouldBeEncrypted = hasMinCodeVersion(inputData.platformDetails, {
    majorDesktop: 10,
  });

  if (!shouldBeEncrypted) {
    return devices.map(({ deviceToken }) => ({
      deviceToken,
      notification,
    }));
  }
  return await prepareEncryptedWNSNotifications(devices, notification);
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
      +stateVersion: number,
    }
  | {
      +source: 'mark_as_unread' | 'mark_as_read' | 'activity_update',
      +dbID: string,
      +userID: string,
      +codeVersion: number,
      +stateVersion: number,
    };

type APNsDelivery = {
  +source: $PropertyType<NotificationInfo, 'source'>,
  +deviceType: 'ios' | 'macos',
  +iosID: string,
  +deviceTokens: $ReadOnlyArray<string>,
  +codeVersion: number,
  +stateVersion: number,
  +errors?: $ReadOnlyArray<ResponseFailure>,
  +encryptedPayloadHashes?: $ReadOnlyArray<string>,
  +deviceTokensToPayloadHash?: {
    +[deviceToken: string]: string,
  },
};
type APNsResult = {
  info: NotificationInfo,
  delivery: APNsDelivery,
  invalidTokens?: $ReadOnlyArray<string>,
};
async function sendAPNsNotification(
  platform: 'ios' | 'macos',
  targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>,
  notificationInfo: NotificationInfo,
): Promise<APNsResult> {
  const { source, codeVersion, stateVersion } = notificationInfo;

  const response = await apnPush({
    targetedNotifications,
    platformDetails: { platform, codeVersion },
  });
  invariant(
    new Set(targetedNotifications.map(({ notification }) => notification.id))
      .size === 1,
    'Encrypted versions of the same notification must share id value',
  );
  const iosID = targetedNotifications[0].notification.id;
  const deviceTokens = targetedNotifications.map(
    ({ deviceToken }) => deviceToken,
  );
  let delivery: APNsDelivery = {
    source,
    deviceType: platform,
    iosID,
    deviceTokens,
    codeVersion,
    stateVersion,
  };
  if (response.errors) {
    delivery = {
      ...delivery,
      errors: response.errors,
    };
  }

  const deviceTokensToPayloadHash: { [string]: string } = {};
  for (const targetedNotification of targetedNotifications) {
    if (targetedNotification.encryptedPayloadHash) {
      deviceTokensToPayloadHash[targetedNotification.deviceToken] =
        targetedNotification.encryptedPayloadHash;
    }
  }
  if (Object.keys(deviceTokensToPayloadHash).length !== 0) {
    delivery = {
      ...delivery,
      deviceTokensToPayloadHash,
    };
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

type PushResult = AndroidResult | APNsResult | WebResult | WNSResult;
type PushDelivery = AndroidDelivery | APNsDelivery | WebDelivery | WNSDelivery;
type AndroidDelivery = {
  source: $PropertyType<NotificationInfo, 'source'>,
  deviceType: 'android',
  androidIDs: $ReadOnlyArray<string>,
  deviceTokens: $ReadOnlyArray<string>,
  codeVersion: number,
  stateVersion: number,
  errors?: $ReadOnlyArray<Object>,
};
type AndroidResult = {
  info: NotificationInfo,
  delivery: AndroidDelivery,
  invalidTokens?: $ReadOnlyArray<string>,
};
async function sendAndroidNotification(
  targetedNotifications: $ReadOnlyArray<TargetedAndroidNotification>,
  notificationInfo: NotificationInfo,
): Promise<AndroidResult> {
  const collapseKey = notificationInfo.collapseKey
    ? notificationInfo.collapseKey
    : null; // for Flow...
  const { source, codeVersion, stateVersion } = notificationInfo;
  const response = await fcmPush({
    targetedNotifications,
    collapseKey,
    codeVersion,
  });
  const deviceTokens = targetedNotifications.map(
    ({ deviceToken }) => deviceToken,
  );
  const androidIDs = response.fcmIDs ? response.fcmIDs : [];
  const delivery: AndroidDelivery = {
    source,
    deviceType: 'android',
    androidIDs,
    deviceTokens,
    codeVersion,
    stateVersion,
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
  +stateVersion: number,
  +errors?: $ReadOnlyArray<WebPushError>,
};
type WebResult = {
  +info: NotificationInfo,
  +delivery: WebDelivery,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function sendWebNotifications(
  targetedNotifications: $ReadOnlyArray<TargetedWebNotification>,
  notificationInfo: NotificationInfo,
): Promise<WebResult> {
  const { source, codeVersion, stateVersion } = notificationInfo;

  const response = await webPush(targetedNotifications);

  const deviceTokens = targetedNotifications.map(
    ({ deviceToken }) => deviceToken,
  );
  const delivery: WebDelivery = {
    source,
    deviceType: 'web',
    deviceTokens,
    codeVersion,
    errors: response.errors,
    stateVersion,
  };
  const result: WebResult = {
    info: notificationInfo,
    delivery,
    invalidTokens: response.invalidTokens,
  };
  return result;
}

type WNSDelivery = {
  +source: $PropertyType<NotificationInfo, 'source'>,
  +deviceType: 'windows',
  +wnsIDs: $ReadOnlyArray<string>,
  +deviceTokens: $ReadOnlyArray<string>,
  +codeVersion?: number,
  +stateVersion: number,
  +errors?: $ReadOnlyArray<WNSPushError>,
};
type WNSResult = {
  +info: NotificationInfo,
  +delivery: WNSDelivery,
  +invalidTokens?: $ReadOnlyArray<string>,
};
async function sendWNSNotification(
  targetedNotifications: $ReadOnlyArray<TargetedWNSNotification>,
  notificationInfo: NotificationInfo,
): Promise<WNSResult> {
  const { source, codeVersion, stateVersion } = notificationInfo;

  const response = await wnsPush(targetedNotifications);

  const deviceTokens = targetedNotifications.map(
    ({ deviceToken }) => deviceToken,
  );
  const wnsIDs = response.wnsIDs ?? [];
  const delivery: WNSDelivery = {
    source,
    deviceType: 'windows',
    wnsIDs,
    deviceTokens,
    codeVersion,
    errors: response.errors,
    stateVersion,
  };
  const result: WNSResult = {
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

  const userCookiePairsToInvalidDeviceTokens = new Map<string, Set<string>>();
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
  const promises: Array<Promise<mixed>> = [];
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
    SELECT platform, device_token, versions, id
    FROM cookies
    WHERE user = ${userID}
      AND device_token IS NOT NULL
  `;
  if (viewer.data.cookieID) {
    deviceTokenQuery.append(SQL`AND id != ${viewer.cookieID} `);
  }
  const [unreadCounts, [deviceTokenResult], [dbID], keyserverID] =
    await Promise.all([
      getUnreadCounts([userID]),
      dbQuery(deviceTokenQuery),
      createIDs('notifications', 1),
      thisKeyserverID(),
    ]);
  const unreadCount = unreadCounts[userID];
  const devices = deviceTokenResult.map(row => {
    const versions = JSON.parse(row.versions);
    return {
      platform: row.platform,
      cookieID: row.id,
      deviceToken: row.device_token,
      codeVersion: versions?.codeVersion,
      stateVersion: versions?.stateVersion,
    };
  });
  const byPlatform = getDevicesByPlatform(devices);

  const preparePromises: Array<Promise<$ReadOnlyArray<PreparePushResult>>> = [];

  const iosVersionsToTokens = byPlatform.get('ios');
  if (iosVersionsToTokens) {
    for (const [versionKey, deviceInfos] of iosVersionsToTokens) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const notification = new apn.Notification();
      notification.topic = getAPNsNotificationTopic({
        platform: 'ios',
        codeVersion,
        stateVersion,
      });
      notification.badge = unreadCount;
      notification.pushType = 'alert';
      notification.payload.keyserverID = keyserverID;
      const preparePromise: Promise<PreparePushResult[]> = (async () => {
        let targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>;
        if (codeVersion > 222) {
          const notificationsArray = await prepareEncryptedAPNsNotifications(
            deviceInfos,
            notification,
            codeVersion,
          );
          targetedNotifications = notificationsArray.map(
            ({ notification: notif, deviceToken, encryptionOrder }) => ({
              notification: notif,
              deviceToken,
              encryptionOrder,
            }),
          );
        } else {
          targetedNotifications = deviceInfos.map(({ deviceToken }) => ({
            notification,
            deviceToken,
          }));
        }
        return targetedNotifications.map(targetedNotification => ({
          notification: targetedNotification,
          platform: 'ios',
          notificationInfo: {
            source,
            dbID,
            userID,
            codeVersion,
            stateVersion,
          },
        }));
      })();

      preparePromises.push(preparePromise);
    }
  }

  const androidVersionsToTokens = byPlatform.get('android');
  if (androidVersionsToTokens) {
    for (const [versionKey, deviceInfos] of androidVersionsToTokens) {
      const { codeVersion, stateVersion } = stringToVersionKey(versionKey);
      const notificationData = {
        badge: unreadCount.toString(),
        badgeOnly: '1',
      };
      const notification = {
        data: { ...notificationData, keyserverID },
      };
      const preparePromise: Promise<PreparePushResult[]> = (async () => {
        let targetedNotifications: $ReadOnlyArray<TargetedAndroidNotification>;
        const priority = 'normal';
        if (codeVersion > 222) {
          const notificationsArray =
            await prepareEncryptedAndroidSilentNotifications(
              deviceInfos,
              notification,
            );
          targetedNotifications = notificationsArray.map(
            ({ notification: notif, deviceToken, encryptionOrder }) => ({
              priority,
              notification: notif,
              deviceToken,
              encryptionOrder,
            }),
          );
        } else {
          targetedNotifications = deviceInfos.map(({ deviceToken }) => ({
            priority,
            deviceToken,
            notification,
          }));
        }
        return targetedNotifications.map(targetedNotification => ({
          notification: targetedNotification,
          platform: 'android',
          notificationInfo: {
            source,
            dbID,
            userID,
            codeVersion,
            stateVersion,
          },
        }));
      })();
      preparePromises.push(preparePromise);
    }
  }

  const macosVersionsToTokens = byPlatform.get('macos');
  if (macosVersionsToTokens) {
    for (const [versionKey, deviceInfos] of macosVersionsToTokens) {
      const { codeVersion, stateVersion, majorDesktopVersion } =
        stringToVersionKey(versionKey);
      const notification = new apn.Notification();
      notification.topic = getAPNsNotificationTopic({
        platform: 'macos',
        codeVersion,
        stateVersion,
        majorDesktopVersion,
      });
      notification.badge = unreadCount;
      notification.pushType = 'alert';
      notification.payload.keyserverID = keyserverID;
      const preparePromise: Promise<PreparePushResult[]> = (async () => {
        const shouldBeEncrypted = hasMinCodeVersion(viewer.platformDetails, {
          web: 47,
          majorDesktop: 9,
        });
        let targetedNotifications: $ReadOnlyArray<TargetedAPNsNotification>;
        if (shouldBeEncrypted) {
          const notificationsArray = await prepareEncryptedAPNsNotifications(
            deviceInfos,
            notification,
            codeVersion,
          );
          targetedNotifications = notificationsArray.map(
            ({ notification: notif, deviceToken, encryptionOrder }) => ({
              notification: notif,
              deviceToken,
              encryptionOrder,
            }),
          );
        } else {
          targetedNotifications = deviceInfos.map(({ deviceToken }) => ({
            deviceToken,
            notification,
          }));
        }

        return targetedNotifications.map(targetedNotification => ({
          notification: targetedNotification,
          platform: 'macos',
          notificationInfo: {
            source,
            dbID,
            userID,
            codeVersion,
            stateVersion,
          },
        }));
      })();
      preparePromises.push(preparePromise);
    }
  }

  const prepareResults = await Promise.all(preparePromises);
  const flattenedPrepareResults = prepareResults.filter(Boolean).flat();
  const deliveryResults = await deliverPushNotifsInEncryptionOrder(
    flattenedPrepareResults,
  );
  await saveNotifResults(deliveryResults, new Map(), false);
}

export { sendPushNotifs, sendRescindNotifs, updateBadgeCount };
