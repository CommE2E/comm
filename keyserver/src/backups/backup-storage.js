// @flow

import { DropboxBackupStorageAdapter } from './dropbox-backup-storage-adapter.js';
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

export type DropboxStorageConfig = {
  +type: 'dropbox',
  +directory: string,
  +appKey: string,
  +appSecret: string,
  +refreshToken: string,
};

export type StorageConfig = LocalStorageConfig | DropboxStorageConfig;

class BackupStorageSpaceExceededError extends Error {
  constructor(message?: string) {
    super(message ?? 'backup_storage_space_exceeded');
  }
}

export interface BackupStorageAdapter {
  listFiles(): Promise<$ReadOnlyArray<StoredFileInfo>>;
  deleteFile(filename: string): Promise<void>;
  createWriteStream(filename: string): Promise<BackupWriteStream>;
}

export interface BackupWriteStream extends stream$Writable {
  getUploadedByteCount(): number;
}

function createBackupStorageAdapter(
  config: StorageConfig,
): BackupStorageAdapter {
  if (config.type === 'dropbox') {
    return new DropboxBackupStorageAdapter(config);
  }
  return new LocalBackupStorageAdapter(config);
}

export { BackupStorageSpaceExceededError, createBackupStorageAdapter };
