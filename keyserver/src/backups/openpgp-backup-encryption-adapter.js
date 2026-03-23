// @flow

import childProcess from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';

import type {
  BackupEncryptionPipeline,
  OpenPGPEncryptionConfig,
} from './backup-encryption.js';

const mkdtemp = promisify(fs.mkdtemp);
const rm = promisify(fs.rm);
const pipeline = promisify(streamPipeline);
const maxCommandOutputLength = 8192;

class OpenPGPBackupEncryptionAdapter {
  config: OpenPGPEncryptionConfig;

  constructor(config: OpenPGPEncryptionConfig) {
    this.config = config;
  }

  async createEncryptedWriteStream(
    filename: string,
    writeStream: stream$Writable,
  ): Promise<BackupEncryptionPipeline> {
    const preparedEncryption = await prepareOpenPGPEncryption(
      filename,
      this.config.armoredPublicKey,
    );
    const gpg = childProcess.spawn(
      'gpg',
      [
        '--batch',
        '--yes',
        '--no-tty',
        '--homedir',
        preparedEncryption.homedir,
        '--trust-model',
        'always',
        '--output',
        '-',
        '--recipient',
        preparedEncryption.recipient,
        '--encrypt',
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    let gpgStderr = '';
    gpg.stderr.on('data', chunk => {
      if (gpgStderr.length >= maxCommandOutputLength) {
        return;
      }
      gpgStderr += chunk
        .toString('utf8')
        .slice(0, maxCommandOutputLength - gpgStderr.length);
    });

    const gpgExitPromise: Promise<void> = new Promise((resolve, reject) => {
      gpg.on('error', reject);
      gpg.on('exit', (code: number | null, signal: string | null) => {
        if (signal !== null) {
          reject(new Error(`gpg received signal ${signal} for ${filename}`));
        } else if (code !== null && code !== 0) {
          const stderrSuffix = gpgStderr ? ` stderr: ${gpgStderr}` : '';
          reject(
            new Error(
              `gpg encryption exited with code ${code} for ` +
                `${filename}.${stderrSuffix}`,
            ),
          );
        } else {
          resolve();
        }
      });
    });

    const abortGPG = (error?: Error) => {
      if (error) {
        gpg.stdin.destroy(error);
        gpg.stdout.destroy(error);
      } else {
        gpg.stdin.destroy();
        gpg.stdout.destroy();
      }
      gpg.stderr.destroy();
      try {
        gpg.kill('SIGTERM');
      } catch {}
    };

    const completion = (async () => {
      try {
        await pipeline(gpg.stdout, writeStream);
        await gpgExitPromise;
      } catch (error) {
        abortGPG(error);
        try {
          await gpgExitPromise;
        } catch {}
        throw error;
      } finally {
        try {
          await preparedEncryption.cleanup();
        } catch (cleanupError) {
          console.warn(
            `cleanup of temporary gpg homedir for ${filename} failed`,
            cleanupError,
          );
        }
      }
    })();

    return {
      writeStream: gpg.stdin,
      completion,
    };
  }
}

type PreparedOpenPGPEncryption = {
  +homedir: string,
  +recipient: string,
  +cleanup: () => Promise<void>,
};

async function prepareOpenPGPEncryption(
  filename: string,
  armoredPublicKey: string,
): Promise<PreparedOpenPGPEncryption> {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), 'backup-gpg-'));
  const cleanup = async () => {
    await rm(tempDirectory, { force: true, recursive: true });
  };

  try {
    await importArmoredPublicKey(tempDirectory, filename, armoredPublicKey);
    const recipient = await getImportedRecipientFingerprint(
      tempDirectory,
      filename,
    );
    return { homedir: tempDirectory, recipient, cleanup };
  } catch (error) {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.warn(
        `cleanup of temporary gpg homedir for ${filename} failed`,
        cleanupError,
      );
    }
    throw error;
  }
}

type GPGCommandOptions = {
  +homedir: string,
  +filename: string,
  +action: string,
  +args: $ReadOnlyArray<string>,
  +stdinString?: string,
  +captureStdout?: boolean,
};

type GPGCommandResult = {
  +stdout: string,
};

function runGPGCommand({
  homedir,
  filename,
  action,
  args,
  stdinString,
  captureStdout = false,
}: GPGCommandOptions): Promise<GPGCommandResult> {
  return new Promise((resolve, reject) => {
    const gpg = childProcess.spawn(
      'gpg',
      ['--batch', '--yes', '--no-tty', '--homedir', homedir, ...args],
      {
        stdio: [
          stdinString !== undefined ? 'pipe' : 'ignore',
          captureStdout ? 'pipe' : 'ignore',
          'pipe',
        ],
      },
    );

    let stdout = '';
    if (captureStdout && gpg.stdout) {
      gpg.stdout.on('data', chunk => {
        if (stdout.length >= maxCommandOutputLength) {
          return;
        }
        stdout += chunk
          .toString('utf8')
          .slice(0, maxCommandOutputLength - stdout.length);
      });
    }

    let stderr = '';
    gpg.stderr.on('data', chunk => {
      if (stderr.length >= maxCommandOutputLength) {
        return;
      }
      stderr += chunk
        .toString('utf8')
        .slice(0, maxCommandOutputLength - stderr.length);
    });

    gpg.on('error', reject);
    gpg.on('exit', (code: number | null, signal: string | null) => {
      if (signal !== null) {
        reject(
          new Error(`gpg ${action} received signal ${signal} for ${filename}`),
        );
      } else if (code !== null && code !== 0) {
        const stderrSuffix = stderr ? ` stderr: ${stderr}` : '';
        reject(
          new Error(
            `gpg ${action} exited with code ${code} for ` +
              `${filename}.${stderrSuffix}`,
          ),
        );
      } else {
        resolve({ stdout });
      }
    });

    if (stdinString !== undefined) {
      gpg.stdin.end(stdinString);
    }
  });
}

async function importArmoredPublicKey(
  homedir: string,
  filename: string,
  armoredPublicKey: string,
): Promise<void> {
  await runGPGCommand({
    homedir,
    filename,
    action: 'public-key import',
    args: ['--import'],
    stdinString: armoredPublicKey,
  });
}

async function getImportedRecipientFingerprint(
  homedir: string,
  filename: string,
): Promise<string> {
  const { stdout } = await runGPGCommand({
    homedir,
    filename,
    action: 'public-key listing',
    args: ['--with-colons', '--list-keys', '--fingerprint'],
    captureStdout: true,
  });

  let pubCount = 0;
  let pubFingerprint = null;
  let expectingPubFingerprint = false;
  let foundEncryptionKey = false;

  for (const line of stdout.split('\n')) {
    if (!line) {
      continue;
    }

    const fields = line.split(':');
    const recordType = fields[0];
    const capabilities = fields[11] ?? '';

    if (recordType === 'pub') {
      pubCount++;
      expectingPubFingerprint = true;
      if (capabilities.includes('e') || capabilities.includes('E')) {
        foundEncryptionKey = true;
      }
    } else if (recordType === 'sub') {
      expectingPubFingerprint = false;
      if (capabilities.includes('e') || capabilities.includes('E')) {
        foundEncryptionKey = true;
      }
    } else if (recordType === 'fpr' && expectingPubFingerprint) {
      pubFingerprint = fields[9] ?? null;
      expectingPubFingerprint = false;
    }
  }

  if (pubCount !== 1 || !pubFingerprint) {
    throw new Error(
      `expected exactly one imported OpenPGP public key for ${filename}`,
    );
  }
  if (!foundEncryptionKey) {
    throw new Error(
      `imported OpenPGP public key is not encryption-capable for ${filename}`,
    );
  }

  return pubFingerprint;
}

export { OpenPGPBackupEncryptionAdapter };
