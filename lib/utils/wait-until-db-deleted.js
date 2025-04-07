// @flow

const databaseResetStatus = Object.freeze({
  resetInProgress: 'RESET_IN_PROGRESS',
  ready: 'READY',
});

export type DatabaseResetStatus = 'RESET_IN_PROGRESS' | 'READY';

let waitingOnDatabaseDeletion = [];
let currentDatabaseStatus: DatabaseResetStatus = 'READY';

function setDatabaseResetStatus(newStatus: DatabaseResetStatus) {
  currentDatabaseStatus = newStatus;
}

function getDatabaseResetStatus(): DatabaseResetStatus {
  return currentDatabaseStatus;
}

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
  getDatabaseResetStatus,
  waitUntilDatabaseDeleted,
  reportDatabaseDeleted,
};
