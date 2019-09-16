// @flow

import childProcess from 'child_process';
import geoip from 'geoip-lite';
import cluster from 'cluster';

import { handleAsyncPromise } from '../responders/handlers';

function updateGeoipDB(): Promise<void> {
  const spawned = childProcess.spawn(
    process.execPath,
    [ '../node_modules/geoip-lite/scripts/updatedb.js' ],
  );
  return new Promise((resolve, reject) => {
    spawned.on('error', reject);
    spawned.on('exit', () => resolve());
  });
}

function reloadGeoipDB(): Promise<void> {
  return new Promise(resolve => geoip.reloadData(resolve));
}

type IPCMessage = {|
  type: 'geoip_reload',
|};
const reloadMessage: IPCMessage = { type: 'geoip_reload' };

async function updateAndReloadGeoipDB(): Promise<void> {
  await updateGeoipDB();
  await reloadGeoipDB();

  if (!cluster.isMaster) {
    return;
  }
  for (const id in cluster.workers) {
    cluster.workers[id].send(reloadMessage);
  }
}

if (!cluster.isMaster) {
  process.on('message', (ipcMessage: IPCMessage) => {
    if (ipcMessage.type === 'geoip_reload') {
      handleAsyncPromise(reloadGeoipDB());
    }
  });
}

export {
  updateAndReloadGeoipDB,
};
