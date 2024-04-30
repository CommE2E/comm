// @flow

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

export { waitUntilDatabaseDeleted, reportDatabaseDeleted };
