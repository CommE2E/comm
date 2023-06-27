// @flow

import { keyserverPrefixID } from './validation-utils.js';
import {
  parsePendingThreadID,
  getPendingThreadID,
} from '../shared/thread-utils.js';
import type {
  ClientDBDraftInfo,
  ClientDBDraftStoreOperation,
  DraftStore,
} from '../types/draft-types';

const draftKeySuffix = '/message_composer';

function convertDraftKeyToNewIDSchema(key: string): string {
  const threadID = key.slice(0, -draftKeySuffix.length);

  const pendingIDContents = parsePendingThreadID(threadID);

  if (!pendingIDContents) {
    return `${keyserverPrefixID}|${threadID}${draftKeySuffix}`;
  }

  const { threadType, sourceMessageID, memberIDs } = pendingIDContents;
  const convertedThreadID = getPendingThreadID(
    threadType,
    memberIDs,
    sourceMessageID ? `${keyserverPrefixID}|${sourceMessageID}` : null,
  );

  return `${convertedThreadID}${draftKeySuffix}`;
}

function convertDraftStoreToNewIDSchema(store: DraftStore): DraftStore {
  return {
    drafts: Object.fromEntries(
      Object.entries(store.drafts).map(
        ([key, value]: [string, any]): [string, string] => [
          convertDraftKeyToNewIDSchema(key),
          value,
        ],
      ),
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
