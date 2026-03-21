// @flow

import childProcess from 'child_process';
import dateFormat from 'dateformat';
import { pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';

import { getCommConfig } from 'lib/utils/comm-config.js';

import { runBackup } from '../backups/backup-runner.js';
import {
  createBackupStorageAdapter,
  type StorageConfig,
} from '../backups/backup-storage.js';

const pipeline = promisify(streamPipeline);

type PhorgeBackupConfig = {
  +enabled: boolean,
  +phorgeDirectory: string,
  +storage: StorageConfig,
  +maxDirSizeMiB?: ?number,
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
  const filename = `phorge.${dateString}.sql.gz`;
  const storageAdapter = createBackupStorageAdapter(phorgeBackupConfig.storage);

  await runBackup({
    jobName: 'phorge',
    filename,
    filenamePrefix: 'phorge.',
    filenameSuffix: '.sql.gz',
    storageAdapter,
    maxDirSizeMiB: phorgeBackupConfig.maxDirSizeMiB,
    writeBackup: writeStream =>
      writePhorgeBackup(
        phorgeBackupConfig.phorgeDirectory,
        filename,
        writeStream,
      ),
  });
}

async function writePhorgeBackup(
  phorgeDirectory: string,
  filename: string,
  writeStream: stream$Writable,
): Promise<void> {
  const phorgeDump = childProcess.spawn(
    './bin/storage',
    ['dump', '--compress'],
    {
      cwd: phorgeDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  let stderr = '';
  phorgeDump.stderr.on('data', chunk => {
    if (stderr.length >= 8192) {
      return;
    }
    stderr += chunk.toString('utf8').slice(0, 8192 - stderr.length);
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
        const stderrSuffix = stderr ? ` stderr: ${stderr}` : '';
        reject(
          new Error(
            `phorge storage dump exited with code ${code} for ` +
              `${filename}.${stderrSuffix}`,
          ),
        );
      } else {
        resolve();
      }
    });
  });

  try {
    try {
      await pipeline(phorgeDump.stdout, writeStream);
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
  }
}

export { backupPhorge };
