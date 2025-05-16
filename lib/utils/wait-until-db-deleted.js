// @flow

type DatabaseResetStatus = 'RESET_IN_PROGRESS' | 'READY';

const databaseResetStatus = Object.freeze({
  RESET_IN_PROGRESS: 'RESET_IN_PROGRESS',
  READY: 'READY',
});

let currentDatabaseStatus: DatabaseResetStatus = 'READY';

async function waitUntilDatabaseReady() {
  if (currentDatabaseStatus !== databaseResetStatus.READY) {
    console.log('[wait util] DB not ready, waiting');
    await waitUntilDatabaseDeleted();
    console.log('[wait util] Ok deleted');
  } else {
    console.log('[wait util] DB was ready');
  }
}

function setDatabaseResetStatus(newStatus: DatabaseResetStatus) {
  console.log('[wait util] Setting DB status', newStatus);
  currentDatabaseStatus = newStatus;
}

let waitingOnDatabaseDeletion = [];

function waitUntilDatabaseDeleted(): Promise<void> {
  return new Promise(resolve => {
    waitingOnDatabaseDeletion.push(resolve);
  });
}

function reportDatabaseDeleted() {
  const callbacksToTrigger = waitingOnDatabaseDeletion;
  waitingOnDatabaseDeletion = [];

  for (const callback of callbacksToTrigger) {
    callback();
  }
}

export {
  databaseResetStatus,
  setDatabaseResetStatus,
  waitUntilDatabaseReady,
  waitUntilDatabaseDeleted,
  reportDatabaseDeleted,
};
