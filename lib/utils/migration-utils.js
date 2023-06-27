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
import type { CalendarFilter } from '../types/filter-types.js';
import type { ConnectionInfo } from '../types/socket-types.js';

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

function convertCalendarFiltersToNewIDSchema(
  filters: $ReadOnlyArray<CalendarFilter>,
): $ReadOnlyArray<CalendarFilter> {
  return filters.map(filter =>
    filter.type === 'threads'
      ? { type: 'threads', threadIDs: filter.threadIDs.map(id => '256|' + id) }
      : filter,
  );
}

function convertConnectionInfoToNewIDSchema(
  connectionInfo: ConnectionInfo,
): ConnectionInfo {
  return {
    ...connectionInfo,
    queuedActivityUpdates: connectionInfo.queuedActivityUpdates.map(
      ({ focus, threadID, latestMessage }) => ({
        focus,
        threadID: '256|' + threadID,
        latestMessage: latestMessage ? '256|' + latestMessage : null,
      }),
    ),
    actualizedCalendarQuery: {
      ...connectionInfo.actualizedCalendarQuery,
      filters: convertCalendarFiltersToNewIDSchema(
        connectionInfo.actualizedCalendarQuery.filters,
      ),
    },
  };
}

export {
  convertDraftKeyToNewIDSchema,
  convertDraftStoreToNewIDSchema,
  generateIDSchemaMigrationOpsForDrafts,
  convertCalendarFiltersToNewIDSchema,
  convertConnectionInfoToNewIDSchema,
};
