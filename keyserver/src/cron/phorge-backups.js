// @flow

import childProcess from 'child_process';
import dateFormat from 'dateformat';

import { getCommConfig } from 'lib/utils/comm-config.js';

import type { BackupConfig } from './backups.js';
import type { BackupEncryptionConfig } from '../backups/backup-encryption.js';
import { createBackupOutputPipeline } from '../backups/backup-output.js';
import { runBackup } from '../backups/backup-runner.js';
import { createBackupStorageAdapter } from '../backups/backup-storage.js';

const maxCommandOutputLength = 8192;

type PhorgeBackupConfig = {
  ...BackupConfig,
  +phorgeDirectory: string,
};

function getPhorgeBackupConfig(): Promise<?PhorgeBackupConfig> {
  return getCommConfig({ folder: 'secrets', name: 'phorge_backups' });
}

async function backupPhorge() {
  const phorgeBackupConfig = await getPhorgeBackupConfig();
  if (!phorgeBackupConfig || !phorgeBackupConfig.enabled) {
    return;
  }

  const dateString = dateFormat('yyyy-mm-dd-HH:MM');
  const filenameSuffix = phorgeBackupConfig.encryption
    ? '.sql.gz.gpg'
    : '.sql.gz';
  const filename = `phorge.${dateString}${filenameSuffix}`;
  const storageAdapter = createBackupStorageAdapter(phorgeBackupConfig.storage);

  await runBackup({
    jobName: 'phorge',
    filename,
    filenamePrefix: 'phorge.',
    filenameSuffix,
    storageAdapter,
    maxDirSizeMiB: phorgeBackupConfig.maxDirSizeMiB,
    writeBackup: writeStream =>
      writePhorgeBackup(
        phorgeBackupConfig.phorgeDirectory,
        filename,
        phorgeBackupConfig.encryption,
        writeStream,
      ),
  });
}

async function writePhorgeBackup(
  phorgeDirectory: string,
  filename: string,
  encryption: ?BackupEncryptionConfig,
  writeStream: stream$Writable,
): Promise<void> {
  const phorgeDump = childProcess.spawn('./bin/storage', ['dump'], {
    cwd: phorgeDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  phorgeDump.stderr.on('data', chunk => {
    if (stderr.length >= maxCommandOutputLength) {
      return;
    }
    stderr += chunk
      .toString('utf8')
      .slice(0, maxCommandOutputLength - stderr.length);
  });

  const { rawStream, completion } = await createBackupOutputPipeline({
    filename,
    writeStream,
    encryption,
  });

  let stdout = '';
  rawStream.on('data', chunk => {
    if (stdout.length >= maxCommandOutputLength) {
      return;
    }
    stdout += chunk
      .toString('utf8')
      .slice(0, maxCommandOutputLength - stdout.length);
  });

  const exitPromise: Promise<void> = new Promise((resolve, reject) => {
    phorgeDump.on('error', reject);
    phorgeDump.on('exit', (code: number | null, signal: string | null) => {
      if (signal !== null) {
        reject(
          new Error(
            `phorge storage dump received signal ${signal} for ${filename}`,
          ),
        );
      } else if (code !== null && code !== 0) {
        const stdoutSuffix = stdout ? ` stdout: ${stdout}` : '';
        const stderrSuffix = stderr ? ` stderr: ${stderr}` : '';
        reject(
          new Error(
            `phorge storage dump exited with code ${code} for ` +
              `${filename}.${stdoutSuffix}${stderrSuffix}`,
          ),
        );
      } else {
        resolve();
      }
    });
  });

  phorgeDump.stdout.pipe(rawStream);

  try {
    try {
      await completion;
    } catch (error) {
      try {
        await exitPromise;
      } catch {}
      throw error;
    }
    await exitPromise;
  } finally {
    phorgeDump.stdout.destroy();
    phorgeDump.stderr.destroy();
    rawStream.destroy();
  }
}

export { backupPhorge };
