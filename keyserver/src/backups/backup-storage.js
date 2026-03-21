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
  +folder: string,
};

export type DropboxStorageConfig = {
  +type: 'dropbox',
  +folder: string,
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

class BackupStorageAdapter {
  async listFiles(): Promise<$ReadOnlyArray<StoredFileInfo>> {
    throw new Error('BackupStorageAdapter.listFiles not implemented');
  }

  async deleteFile(filename: string): Promise<void> {
    void filename;
    throw new Error('BackupStorageAdapter.deleteFile not implemented');
  }

  async createWriteStream(filename: string): Promise<stream$Writable> {
    void filename;
    throw new Error('BackupStorageAdapter.createWriteStream not implemented');
  }
}

function createBackupStorageAdapter(
  config: StorageConfig,
): BackupStorageAdapter {
  if (config.type === 'local') {
    return new LocalBackupStorageAdapter(config);
  }
  return new DropboxBackupStorageAdapter(config);
}

export {
  BackupStorageAdapter,
  BackupStorageSpaceExceededError,
  createBackupStorageAdapter,
};
