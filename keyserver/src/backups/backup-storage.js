// @flow

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

export type StorageConfig = LocalStorageConfig;

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
  return new LocalBackupStorageAdapter(config);
}

export { BackupStorageAdapter, createBackupStorageAdapter };
