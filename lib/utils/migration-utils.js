// @flow

import invariant from 'invariant';

import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import type { TranslatedThreadMessageInfos } from './message-ops-utils.js';
import { entries } from './objects.js';
import {
  convertRawMessageInfoToNewIDSchema,
  convertRawThreadInfoToNewIDSchema,
} from '../_generated/migration-utils.js';
import {
  parsePendingThreadID,
  getPendingThreadID,
  draftKeySuffix,
} from '../shared/thread-utils.js';
import type {
  ClientDBDraftInfo,
  ClientDBDraftStoreOperation,
  DraftStore,
} from '../types/draft-types';
import type { RawMessageInfo } from '../types/message-types.js';
import {
  threadPermissions,
  threadPermissionPropagationPrefixes,
  threadPermissionFilterPrefixes,
} from '../types/thread-permission-types.js';
import type { MixedRawThreadInfos } from '../types/thread-types.js';

function convertDraftKeyToNewIDSchema(key: string): string {
  const threadID = key.slice(0, -draftKeySuffix.length);
  const convertedThreadID = convertIDToNewSchema(
    threadID,
    authoritativeKeyserverID(),
  );
  return `${convertedThreadID}${draftKeySuffix}`;
}

function convertDraftStoreToNewIDSchema(store: DraftStore): DraftStore {
  return {
    drafts: Object.fromEntries(
      entries(store.drafts).map(([key, value]) => [
        convertDraftKeyToNewIDSchema(key),
        value,
      ]),
    ),
  };
}

function generateIDSchemaMigrationOpsForDrafts(
  drafts: $ReadOnlyArray<ClientDBDraftInfo>,
): $ReadOnlyArray<ClientDBDraftStoreOperation> {
  const operations = drafts.map(draft => ({
    type: 'update',
    payload: {
      key: convertDraftKeyToNewIDSchema(draft.key),
      text: draft.text,
    },
  }));
  return [{ type: 'remove_all' }, ...operations];
}

function convertMessageStoreThreadsToNewIDSchema(
  messageStoreThreads: TranslatedThreadMessageInfos,
): TranslatedThreadMessageInfos {
  return Object.fromEntries(
    entries(messageStoreThreads).map(([id, translatedThreadMessageInfo]) => [
      `${authoritativeKeyserverID()}|` + id,
      translatedThreadMessageInfo,
    ]),
  );
}

function convertThreadStoreThreadInfosToNewIDSchema(
  threadStoreThreadInfos: MixedRawThreadInfos,
): MixedRawThreadInfos {
  return Object.fromEntries(
    entries(threadStoreThreadInfos).map(([id, threadInfo]) => {
      invariant(
        !threadInfo.minimallyEncoded,
        `threadInfo during ID schema migration shouldn't be minimallyEncoded`,
      );
      return [
        `${authoritativeKeyserverID()}|` + id,
        convertRawThreadInfoToNewIDSchema(threadInfo),
      ];
    }),
  );
}

function convertIDToNewSchema(threadID: string, idPrefix: string): string {
  const pendingIDContents = parsePendingThreadID(threadID);

  if (!pendingIDContents) {
    return convertNonPendingIDToNewSchema(threadID, idPrefix);
  }

  const { threadType, sourceMessageID, memberIDs } = pendingIDContents;

  if (!sourceMessageID) {
    return threadID;
  }

  return getPendingThreadID(
    threadType,
    memberIDs,
    convertNonPendingIDToNewSchema(sourceMessageID, idPrefix),
  );
}

function convertNonPendingIDToNewSchema(
  threadID: string,
  idPrefix: string,
): string {
  if (threadID.indexOf('|') === -1) {
    return `${idPrefix}|${threadID}`;
  }
  return threadID;
}

function convertNotificationMessageInfoToNewIDSchema(
  messageInfosString: ?string,
): ?$ReadOnlyArray<RawMessageInfo> {
  let messageInfos: ?$ReadOnlyArray<RawMessageInfo> = null;
  if (messageInfosString) {
    messageInfos = JSON.parse(messageInfosString);
  }

  if (messageInfos?.some(message => message.threadID.indexOf('|') === -1)) {
    messageInfos = messageInfos?.map(convertRawMessageInfoToNewIDSchema);
  }
  return messageInfos;
}

// This is an array of all permissions that need to be removed
// in an upcoming migration for roles. Once the migrations are landed,
// no changes to this array should be made to prevent future migrations
// from having unexpected behavior.
// See context in https://linear.app/comm/issue/ENG-5622/#comment-2d98a2cd
const permissionsToRemoveInMigration: $ReadOnlyArray<string> = [
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.OPEN +
    threadPermissions.VOICED,

  threadPermissions.JOIN_THREAD,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_ENTRIES,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_THREAD_NAME,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_THREAD_DESCRIPTION,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_THREAD_COLOR,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.TOP_LEVEL +
    threadPermissions.CREATE_SUBCHANNELS,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_THREAD_AVATAR,
  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissionFilterPrefixes.TOP_LEVEL +
    threadPermissions.CREATE_SIDEBARS,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.ADD_MEMBERS,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.REMOVE_MEMBERS,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.CHANGE_ROLE,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_PERMISSIONS,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.MANAGE_PINS,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.REACT_TO_MESSAGE,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.EDIT_MESSAGE,

  threadPermissionPropagationPrefixes.DESCENDANT +
    threadPermissions.MANAGE_INVITE_LINKS,
];

export {
  convertDraftKeyToNewIDSchema,
  convertDraftStoreToNewIDSchema,
  generateIDSchemaMigrationOpsForDrafts,
  convertMessageStoreThreadsToNewIDSchema,
  convertThreadStoreThreadInfosToNewIDSchema,
  convertNonPendingIDToNewSchema,
  convertIDToNewSchema,
  convertNotificationMessageInfoToNewIDSchema,
  permissionsToRemoveInMigration,
};
