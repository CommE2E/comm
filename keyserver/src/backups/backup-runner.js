// @flow

import {
  type BackupStorageAdapter,
  type StoredFileInfo,
} from './backup-storage.js';

const backupWatchFrequency = 60 * 1000;

export type WriteBackup = (
  writeStream: stream$Writable,
  filename: string,
) => Promise<void>;

type RunBackupOptions = {
  +filename: string,
  +filenamePrefix: string,
  +filenameSuffix: string,
  +storageAdapter: BackupStorageAdapter,
  +writeBackup: WriteBackup,
  +maxDirSizeMiB?: ?number,
  +retries?: number,
};

async function runBackup({
  filename,
  filenamePrefix,
  filenameSuffix,
  storageAdapter,
  writeBackup,
  maxDirSizeMiB,
  retries = 2,
}: RunBackupOptions): Promise<void> {
  await saveBackup({
    filename,
    filenamePrefix,
    filenameSuffix,
    storageAdapter,
    writeBackup,
    retries,
  });
  await deleteOldBackupsIfSpaceExceeded({
    filenamePrefix,
    filenameSuffix,
    storageAdapter,
    maxDirSizeMiB,
  });
}

type SaveBackupOptions = {
  +filename: string,
  +filenamePrefix: string,
  +filenameSuffix: string,
  +storageAdapter: BackupStorageAdapter,
  +writeBackup: WriteBackup,
  +retries: number,
};

async function saveBackup({
  filename,
  filenamePrefix,
  filenameSuffix,
  storageAdapter,
  writeBackup,
  retries,
}: SaveBackupOptions): Promise<void> {
  try {
    await tryRunBackup(storageAdapter, filename, writeBackup);
  } catch (error) {
    if (error.code !== 'ENOSPC') {
      throw error;
    }
    if (!retries) {
      throw error;
    }
    const deleted = await deleteOldestBackup(
      storageAdapter,
      filenamePrefix,
      filenameSuffix,
    );
    if (!deleted) {
      throw error;
    }
    await saveBackup({
      filename,
      filenamePrefix,
      filenameSuffix,
      storageAdapter,
      writeBackup,
      retries: retries - 1,
    });
  }
}

async function tryRunBackup(
  storageAdapter: BackupStorageAdapter,
  filename: string,
  writeBackup: WriteBackup,
): Promise<void> {
  const timeoutObject: { timeout: ?TimeoutID } = { timeout: null };
  const setBackupTimeout = (alreadyWaited: number) => {
    timeoutObject.timeout = setTimeout(() => {
      const nowWaited = alreadyWaited + backupWatchFrequency;
      console.log(
        `writing backup for ${filename} has taken ${nowWaited}ms so far`,
      );
      setBackupTimeout(nowWaited);
    }, backupWatchFrequency);
  };
  setBackupTimeout(0);

  const writeStream = await storageAdapter.createWriteStream(filename);
  writeStream.on('error', (error: Error) => {
    console.warn(`write stream emitted error for ${filename}`, error);
  });

  try {
    await writeBackup(writeStream, filename);
  } catch (error) {
    try {
      writeStream.destroy(error);
    } catch {}
    try {
      await storageAdapter.deleteFile(filename);
    } catch (deleteError) {
      console.warn(
        `cleanup of failed backup for ${filename} also failed`,
        deleteError,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutObject.timeout);
  }
}

type DeleteOldBackupsOptions = {
  +filenamePrefix: string,
  +filenameSuffix: string,
  +storageAdapter: BackupStorageAdapter,
  +maxDirSizeMiB?: ?number,
};

async function deleteOldBackupsIfSpaceExceeded({
  filenamePrefix,
  filenameSuffix,
  storageAdapter,
  maxDirSizeMiB,
}: DeleteOldBackupsOptions): Promise<void> {
  if (!maxDirSizeMiB) {
    return;
  }

  const sortedFileInfos = await getSortedFileInfos(
    storageAdapter,
    filenamePrefix,
    filenameSuffix,
  );
  const mostRecentFile = sortedFileInfos.pop();
  if (!mostRecentFile) {
    return;
  }
  let bytesLeft = maxDirSizeMiB * 1024 * 1024 - mostRecentFile.byteCount;

  const deletePromises: Array<Promise<void>> = [];
  for (let i = sortedFileInfos.length - 1; i >= 0; i--) {
    const fileInfo = sortedFileInfos[i];
    bytesLeft -= fileInfo.byteCount;
    if (bytesLeft <= 0) {
      deletePromises.push(storageAdapter.deleteFile(fileInfo.filename));
    }
  }
  await Promise.all(deletePromises);
}

async function deleteOldestBackup(
  storageAdapter: BackupStorageAdapter,
  filenamePrefix: string,
  filenameSuffix: string,
): Promise<boolean> {
  const sortedFileInfos = await getSortedFileInfos(
    storageAdapter,
    filenamePrefix,
    filenameSuffix,
  );
  if (sortedFileInfos.length === 0) {
    return false;
  }
  await storageAdapter.deleteFile(sortedFileInfos[0].filename);
  return true;
}

async function getSortedFileInfos(
  storageAdapter: BackupStorageAdapter,
  filenamePrefix: string,
  filenameSuffix: string,
): Promise<StoredFileInfo[]> {
  const files = await storageAdapter.listFiles();
  const filteredFiles = files.filter(
    file =>
      file.filename.startsWith(filenamePrefix) &&
      file.filename.endsWith(filenameSuffix),
  );
  filteredFiles.sort((a, b) => a.lastModifiedTime - b.lastModifiedTime);
  return filteredFiles;
}

export { runBackup };
