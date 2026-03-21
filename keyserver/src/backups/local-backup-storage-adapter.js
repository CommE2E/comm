// @flow

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import {
  BackupStorageAdapter,
  type LocalStorageConfig,
  type StoredFileInfo,
} from './backup-storage.js';

const readdir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);
const unlink = promisify(fs.unlink);

class LocalBackupStorageAdapter extends BackupStorageAdapter {
  +folder: string;

  constructor(config: LocalStorageConfig) {
    super();
    this.folder = config.folder;
  }

  async listFiles(): Promise<$ReadOnlyArray<StoredFileInfo>> {
    const filenames = await readdir(this.folder);
    const files = await Promise.all(
      filenames.map(async filename => {
        const stats = await lstat(path.join(this.folder, filename));
        if (stats.isDirectory()) {
          return null;
        }
        return {
          filename,
          lastModifiedTime: stats.mtime.getTime(),
          byteCount: stats.size,
        };
      }),
    );
    const filteredFiles: StoredFileInfo[] = [];
    for (const file of files) {
      if (file) {
        filteredFiles.push(file);
      }
    }
    return filteredFiles;
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await unlink(path.join(this.folder, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async createWriteStream(filename: string): Promise<stream$Writable> {
    return fs.createWriteStream(path.join(this.folder, filename));
  }
}

export { LocalBackupStorageAdapter };
