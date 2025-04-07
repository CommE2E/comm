// @flow

type DatabaseResetStatus = 'RESET_IN_PROGRESS' | 'READY';

const databaseResetStatus = Object.freeze({
  RESET_IN_PROGRESS: 'RESET_IN_PROGRESS',
  READY: 'READY',
});

let currentDatabaseStatus: DatabaseResetStatus = 'READY';

async function waitUntilDatabaseReady() {
  if (currentDatabaseStatus !== databaseResetStatus.READY) {
    await waitUntilDatabaseDeleted();
  }
}

function setDatabaseResetStatus(newStatus: DatabaseResetStatus) {
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
