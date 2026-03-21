// @flow

const backupWatchFrequency = 60 * 1000;

type WriteBackup = (filename: string, filePath: string) => Promise<void>;

type RunBackupOptions = {
  +filename: string,
  +filePath: string,
  +writeBackup: WriteBackup,
  +deleteOldestBackup: () => Promise<boolean>,
  +cleanupBackup: string => Promise<void>,
  +retries?: number,
};

async function runBackup({
  filename,
  filePath,
  writeBackup,
  deleteOldestBackup,
  cleanupBackup,
  retries = 2,
}: RunBackupOptions): Promise<void> {
  try {
    await tryRunBackup(filename, filePath, writeBackup);
  } catch (error) {
    console.warn(`tryRunBackup threw for ${filename}`, error);
    if (error.code !== 'ENOSPC') {
      try {
        await cleanupBackup(filePath);
      } catch (cleanupError) {
        console.warn(`cleanupBackup threw for ${filename}`, cleanupError);
      }
      throw error;
    }
    if (!retries) {
      throw error;
    }
    const deleted = await deleteOldestBackup();
    if (!deleted) {
      throw error;
    }
    await runBackup({
      filename,
      filePath,
      writeBackup,
      deleteOldestBackup,
      cleanupBackup,
      retries: retries - 1,
    });
  }
}

async function tryRunBackup(
  filename: string,
  filePath: string,
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

  try {
    await writeBackup(filename, filePath);
  } finally {
    clearTimeout(timeoutObject.timeout);
  }
}

export { runBackup };
