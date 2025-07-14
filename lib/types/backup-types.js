// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

// This type should match `SIWEBackupData` in
// `native/native_rust_library/src/backup.rs`
export type SIWEBackupData = {
  +siweBackupMsgNonce: string,
  +siweBackupMsgStatement: string,
  +siweBackupMsgIssuedAt: string,
};
export const siweBackupDataValidator: TInterface<SIWEBackupData> =
  tShape<SIWEBackupData>({
    siweBackupMsgNonce: t.String,
    siweBackupMsgStatement: t.String,
    siweBackupMsgIssuedAt: t.String,
  });

// This type should match `BackupVersionInfo` in
// `shared/comm-lib/src/backup/mod.rs`
export type BackupVersionInfo = {
  +codeVersion: number,
  +stateVersion: number,
  +dbVersion: number,
};
export const backupVersionInfoValidator: TInterface<BackupVersionInfo> =
  tShape<BackupVersionInfo>({
    codeVersion: t.Number,
    stateVersion: t.Number,
    dbVersion: t.Number,
  });
// This type should match `LatestBackupInfo` in
// `native/native_rust_library/src/backup.rs`
export type LatestBackupInfo = {
  +backupID: string,
  +userID: string,
  +siweBackupData?: ?SIWEBackupData,
  +keyserverDeviceID?: ?string,
  // ISO 8601 / RFC 3339 DateTime string
  +creationTimestamp: string,
  +totalBackupSize: number,
  +versionInfo: BackupVersionInfo,
};
export const latestBackupInfoResponseValidator: TInterface<LatestBackupInfo> =
  tShape<LatestBackupInfo>({
    backupID: t.String,
    userID: t.String,
    siweBackupData: t.maybe(siweBackupDataValidator),
    keyserverDeviceID: t.maybe(t.String),
    creationTimestamp: t.String,
    totalBackupSize: t.Number,
    versionInfo: backupVersionInfoValidator,
  });

// This type should match `UserKeys` in
// `native/native_rust_library/src/backup.rs`
export type UserKeys = {
  +backupDataKey: string,
  +backupLogDataKey: string,
  +pickleKey: string,
  +pickledAccount: string,
};
export const userKeysResponseValidator: TInterface<UserKeys> = tShape<UserKeys>(
  {
    backupDataKey: t.String,
    backupLogDataKey: t.String,
    pickleKey: t.String,
    pickledAccount: t.String,
  },
);

export type LocalLatestBackupInfo = {
  +backupID: string,
  +timestamp: number,
};

export type BackupStore = {
  +latestBackupInfo: ?LocalLatestBackupInfo,
  +latestDatabaseVersion?: number,
  +ownDevicesWithoutBackup?: $ReadOnlyArray<string>,
};

export const restoreUserDataSteps = Object.freeze({
  RESTORE_DATABASE: 'restore_database',
  MIGRATE_BACKUP_SCHEMA: 'migrate_backup_schema',
  RUN_RESTORED_BACKUP_MIGRATIONS: 'run_restored_backup_migrations',
  ASSIGN_NEW_HOLDERS: 'assign_new_holders',
  REMOVE_LOCAL_MESSAGE_INFOS: 'remove_local_message_infos',
  UPDATE_PEERS: 'update_peers',
  COPY_CONTENT_FROM_BACKUP_DB: 'copy_content_from_backup_db',
});
export type RestoreUserDataStep = $Values<typeof restoreUserDataSteps>;

export const restoreUserDataStepsOrder: $ReadOnlyArray<RestoreUserDataStep> = [
  restoreUserDataSteps.RESTORE_DATABASE,
  restoreUserDataSteps.MIGRATE_BACKUP_SCHEMA,
  restoreUserDataSteps.RUN_RESTORED_BACKUP_MIGRATIONS,
  restoreUserDataSteps.ASSIGN_NEW_HOLDERS,
  restoreUserDataSteps.REMOVE_LOCAL_MESSAGE_INFOS,
  restoreUserDataSteps.COPY_CONTENT_FROM_BACKUP_DB,
];

export type RestoreBackupState =
  | {
      +status: 'no_backup',
      +payload: {},
    }
  | {
      +status: 'user_keys_backup_started',
      +payload: {},
    }
  | {
      +status: 'user_keys_backup_success',
      +payload: {},
    }
  | {
      +status: 'user_keys_backup_failed',
      +payload: {},
    }
  | {
      +status: 'user_data_backup_started',
      +payload: {},
    }
  | {
      +status: 'user_data_backup_success',
      +payload: {},
    }
  | {
      +status: 'user_data_backup_failed',
      +payload: {},
    }
  | {
      +status: 'user_data_restore_started',
      +payload: {
        +step: RestoreUserDataStep,
      },
    }
  | {
      +status: 'user_data_restore_step_completed',
      +payload: {
        +step: RestoreUserDataStep,
      },
    }
  | {
      +status: 'user_data_restore_failed',
      +payload: {
        +step: RestoreUserDataStep,
        +error: Error,
      },
    }
  | {
      +status: 'user_data_restore_completed',
      +payload: {
        +forced?: boolean,
      },
    };
