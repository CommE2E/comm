// @flow

import type { TranslatedThreadMessageInfos } from './message-ops-utils.js';
import { entries } from './objects.js';
import { ashoatKeyserverID } from './validation-utils.js';
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
import type { ThreadStoreThreadInfos } from '../types/thread-types.js';

function convertDraftKeyToNewIDSchema(key: string): string {
  const threadID = key.slice(0, -draftKeySuffix.length);

  const pendingIDContents = parsePendingThreadID(threadID);

  if (!pendingIDContents) {
    return `${ashoatKeyserverID}|${key}`;
  }

  const { threadType, sourceMessageID, memberIDs } = pendingIDContents;

  if (!sourceMessageID) {
    return key;
  }

  const convertedThreadID = getPendingThreadID(
    threadType,
    memberIDs,
    `${ashoatKeyserverID}|${sourceMessageID}`,
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
      `${ashoatKeyserverID}|` + id,
      translatedThreadMessageInfo,
    ]),
  );
}

function convertThreadStoreThreadInfosToNewIDSchema(
  threadStoreThreadInfos: ThreadStoreThreadInfos,
): ThreadStoreThreadInfos {
  return Object.fromEntries(
    entries(threadStoreThreadInfos).map(([id, threadInfo]) => [
      `${ashoatKeyserverID}|` + id,
      convertRawThreadInfoToNewIDSchema(threadInfo),
    ]),
  );
}

function convertNotificationThreadIDToNewIDSchema(threadID: string): string {
  if (threadID.indexOf('|') === -1) {
    return `${ashoatKeyserverID}|${threadID}`;
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

export {
  convertDraftKeyToNewIDSchema,
  convertDraftStoreToNewIDSchema,
  generateIDSchemaMigrationOpsForDrafts,
  convertMessageStoreThreadsToNewIDSchema,
  convertThreadStoreThreadInfosToNewIDSchema,
  convertNotificationThreadIDToNewIDSchema,
  convertNotificationMessageInfoToNewIDSchema,
};
