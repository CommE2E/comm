// @flow

import { LocalBackupStorageAdapter } from './local-backup-storage-adapter.js';

export type StoredFileInfo = {
  +filename: string,
  +lastModifiedTime: number,
  +byteCount: number,
};

export type LocalStorageConfig = {
  +type: 'local',
  +directory: string,
};

export type StorageConfig = LocalStorageConfig;

export interface BackupStorageAdapter {
  listFiles(): Promise<$ReadOnlyArray<StoredFileInfo>>;
  deleteFile(filename: string): Promise<void>;
  createWriteStream(filename: string): Promise<stream$Writable>;
}

function createBackupStorageAdapter(
  config: StorageConfig,
): BackupStorageAdapter {
  return new LocalBackupStorageAdapter(config);
}

export { createBackupStorageAdapter };
