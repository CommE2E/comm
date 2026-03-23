// @flow

import { PassThrough, pipeline as streamPipeline } from 'stream';
import { promisify } from 'util';
import zlib from 'zlib';

import {
  createBackupEncryptionAdapter,
  type BackupEncryptionConfig,
} from './backup-encryption.js';

const pipeline = promisify(streamPipeline);

type BackupOutputOptions = {
  +filename: string,
  +writeStream: stream$Writable,
  +encryption?: ?BackupEncryptionConfig,
};

type BackupOutputPipeline = {
  +rawStream: PassThrough,
  +completion: Promise<mixed>,
};

async function createBackupOutputPipeline({
  filename,
  writeStream,
  encryption,
}: BackupOutputOptions): Promise<BackupOutputPipeline> {
  const rawStream = new PassThrough();
  const gzipStream = zlib.createGzip();

  rawStream.on('error', (error: Error) => {
    console.warn(`backup stdout stream emitted error for ${filename}`, error);
  });
  gzipStream.on('error', (error: Error) => {
    console.warn(`gzip transform stream emitted error for ${filename}`, error);
  });

  if (!encryption) {
    return {
      rawStream,
      completion: pipeline(rawStream, gzipStream, writeStream),
    };
  }

  const encryptionAdapter = createBackupEncryptionAdapter(encryption);
  const encryptedPipeline = await encryptionAdapter.createEncryptedWriteStream(
    filename,
    writeStream,
  );

  const completion = Promise.all([
    pipeline(rawStream, gzipStream, encryptedPipeline.writeStream),
    encryptedPipeline.completion,
  ]);

  return {
    rawStream,
    completion,
  };
}

export { createBackupOutputPipeline };
