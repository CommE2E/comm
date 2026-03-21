// @flow

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import {
  type LocalStorageConfig,
  type StoredFileInfo,
} from './backup-storage.js';

const readdir = promisify(fs.readdir);
const lstat = promisify(fs.lstat);
const unlink = promisify(fs.unlink);

class LocalBackupStorageAdapter {
  +directory: string;

  constructor(config: LocalStorageConfig) {
    this.directory = config.directory;
  }

  async listFiles(): Promise<$ReadOnlyArray<StoredFileInfo>> {
    const filenames = await readdir(this.directory);
    const files = await Promise.all(
      filenames.map(async filename => {
        const stats = await lstat(path.join(this.directory, filename));
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
    return files.filter(Boolean);
  }

  async deleteFile(filename: string): Promise<void> {
    try {
      await unlink(path.join(this.directory, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async createWriteStream(filename: string): Promise<stream$Writable> {
    return fs.createWriteStream(path.join(this.directory, filename));
  }
}

export { LocalBackupStorageAdapter };
