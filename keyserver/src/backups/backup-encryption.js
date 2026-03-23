// @flow

import { OpenPGPBackupEncryptionAdapter } from './openpgp-backup-encryption-adapter.js';

export type OpenPGPEncryptionConfig = {
  +type: 'openpgp',
  +armoredPublicKey: string,
};

export type BackupEncryptionConfig = OpenPGPEncryptionConfig;

export type BackupEncryptionPipeline = {
  +writeStream: stream$Writable,
  +completion: Promise<void>,
};

export interface BackupEncryptionAdapter {
  createEncryptedWriteStream(
    filename: string,
    writeStream: stream$Writable,
  ): Promise<BackupEncryptionPipeline>;
}

function createBackupEncryptionAdapter(
  config: BackupEncryptionConfig,
): BackupEncryptionAdapter {
  if (config.type === 'openpgp') {
    return new OpenPGPBackupEncryptionAdapter(config);
  }
  throw new Error(`unsupported backup encryption config: ${config.type}`);
}

export { createBackupEncryptionAdapter };
