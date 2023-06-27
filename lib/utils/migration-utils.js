// @flow

import { entries } from './objects.js';
import { keyserverPrefixID } from './validation-utils.js';
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

function convertDraftKeyToNewIDSchema(key: string): string {
  const threadID = key.slice(0, -draftKeySuffix.length);

  const pendingIDContents = parsePendingThreadID(threadID);

  if (!pendingIDContents) {
    return `${keyserverPrefixID}|${key}`;
  }

  const { threadType, sourceMessageID, memberIDs } = pendingIDContents;

  if (!sourceMessageID) {
    return key;
  }

  const convertedThreadID = getPendingThreadID(
    threadType,
    memberIDs,
    `${keyserverPrefixID}|${sourceMessageID}`,
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

export {
  convertDraftKeyToNewIDSchema,
  convertDraftStoreToNewIDSchema,
  generateIDSchemaMigrationOpsForDrafts,
};
