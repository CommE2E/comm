// @flow

import invariant from 'invariant';

import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import { getConfig } from './config.js';
import type { TranslatedThreadMessageInfos } from './message-ops-utils.js';
import { entries } from './objects.js';
import { convertRawThreadInfoToNewIDSchema } from '../_generated/migration-utils.js';
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
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { syncedMetadataNames } from '../types/synced-metadata-types.js';
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

export type LegacyMigrationManifest<N: BaseNavInfo, T: BaseAppState<N>> = {
  +[number | string]: (T) => Promise<T>,
};
type PersistedState<N: BaseNavInfo, T: BaseAppState<N>> = T | void;
type ConfigType = {
  +debug: boolean,
};

export type StorageMigrationFunction<N: BaseNavInfo, T: BaseAppState<N>> = (
  debug: boolean,
) => Promise<?PersistedState<N, T>>;

export type MigrationResult<T> = {
  +state: T,
  +ops: StoreOperations,
  +changesSchema?: boolean,
};

export type MigrationFunction<
  N: BaseNavInfo,
  T: BaseAppState<N>,
> = T => Promise<MigrationResult<T>>;

export type MigrationsManifest<N: BaseNavInfo, T: BaseAppState<N>> = {
  +[number | string]: MigrationFunction<N, T>,
};

function createAsyncMigrate<N: BaseNavInfo, T: BaseAppState<N>>(
  legacyMigrations: LegacyMigrationManifest<N, T>,
  config: ConfigType,
  migrations: MigrationsManifest<N, T>,
  handleException: (error: Error, state: T) => T,
  storageMigration: ?StorageMigrationFunction<N, T>,
): (
  state: PersistedState<N, T>,
  currentVersion: number,
) => Promise<?PersistedState<N, T>> {
  const debug = process.env.NODE_ENV !== 'production' && !!config?.debug;
  return async function (
    state: ?PersistedState<N, T>,
    currentVersion: number,
  ): Promise<?PersistedState<N, T>> {
    if (!state && storageMigration) {
      state = await storageMigration(debug);
    }
    if (!state) {
      if (debug) {
        console.log('redux-persist: no inbound state, skipping migration');
      }
      return undefined;
    }

    const inboundVersion: number = state?._persist?.version ?? -1;

    if (inboundVersion === currentVersion) {
      if (debug) {
        console.log('redux-persist: versions match, noop migration');
      }
      return state;
    }
    if (inboundVersion > currentVersion) {
      if (debug) {
        console.error('redux-persist: downgrading version is not supported');
      }
      return state;
    }

    const { state: newState } = await runMigrations(
      legacyMigrations,
      migrations,
      state,
      inboundVersion,
      currentVersion,
      debug,
      handleException,
    );

    return newState;
  };
}

async function runMigrations<N: BaseNavInfo, T: BaseAppState<N>>(
  legacyMigrations: LegacyMigrationManifest<N, T>,
  migrations: MigrationsManifest<N, T>,
  state: T,
  inboundVersion: number,
  currentVersion: number,
  debug: boolean,
  handleException?: (error: Error, state: T) => T,
): Promise<{
  +state: PersistedState<N, T>,
  +schemaChanged: boolean,
}> {
  const migrationKeys = [
    ...Object.keys(legacyMigrations),
    ...Object.keys(migrations),
  ]
    .map(ver => parseInt(ver))
    .filter(key => currentVersion >= key && key > inboundVersion);
  const sortedMigrationKeys = migrationKeys.sort((a, b) => a - b);

  if (debug) {
    console.log('redux-persist: migrationKeys', sortedMigrationKeys);
  }

  let migratedState = state;
  let schemaChanged = false;
  for (const versionKey of sortedMigrationKeys) {
    if (debug) {
      console.log(
        'redux-persist: running migration for versionKey',
        versionKey,
      );
    }

    if (!versionKey) {
      continue;
    }
    try {
      if (legacyMigrations[versionKey]) {
        migratedState = await legacyMigrations[versionKey](migratedState);
      } else {
        const {
          state: newState,
          ops,
          changesSchema,
        } = await migrations[versionKey](migratedState);
        schemaChanged = schemaChanged || !!changesSchema;
        migratedState = newState;
        const versionUpdateOp = {
          type: 'replace_synced_metadata_entry',
          payload: {
            name: syncedMetadataNames.DB_VERSION,
            data: versionKey.toString(),
          },
        };
        const dbOps = {
          ...ops,
          syncedMetadataStoreOperations: [
            ...(ops.syncedMetadataStoreOperations ?? []),
            versionUpdateOp,
          ],
        };
        await getConfig().sqliteAPI.processDBStoreOperations(dbOps);
      }
    } catch (exception) {
      if (handleException) {
        return {
          state: handleException(exception, state),
          schemaChanged,
        };
      }
      throw exception;
    }
  }

  return { state: migratedState, schemaChanged };
}

export {
  convertDraftKeyToNewIDSchema,
  convertDraftStoreToNewIDSchema,
  generateIDSchemaMigrationOpsForDrafts,
  convertMessageStoreThreadsToNewIDSchema,
  convertThreadStoreThreadInfosToNewIDSchema,
  convertIDToNewSchema,
  permissionsToRemoveInMigration,
  createAsyncMigrate,
  runMigrations,
};
