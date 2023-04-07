// @flow

import childProcess from 'child_process';
import cluster from 'cluster';
import geoip from 'geoip-lite';

import { handleAsyncPromise } from '../responders/handlers.js';
import { getCommConfig } from '../utils/comm-config.js';

async function updateGeoipDB(): Promise<void> {
  const geoipLicense = await getCommConfig({
    folder: 'secrets',
    name: 'geoip_license',
  });
  if (!geoipLicense) {
    console.log('no keyserver/secrets/geoip_license.json so skipping update');
    return;
  }
  await spawnUpdater(geoipLicense);
}

function spawnUpdater(geoipLicense: { key: string }): Promise<void> {
  const spawned = childProcess.spawn(process.execPath, [
    '../node_modules/geoip-lite/scripts/updatedb.js',
    `license_key=${geoipLicense.key}`,
  ]);
  return new Promise((resolve, reject) => {
    spawned.on('error', reject);
    spawned.on('exit', () => resolve());
  });
}

function reloadGeoipDB(): Promise<void> {
  return new Promise(resolve => geoip.reloadData(resolve));
}

type IPCMessage = {
  type: 'geoip_reload',
};
const reloadMessage: IPCMessage = { type: 'geoip_reload' };

async function updateAndReloadGeoipDB(): Promise<void> {
  await updateGeoipDB();
  await reloadGeoipDB();

  if (!cluster.isMaster) {
    return;
  }
  for (const id in cluster.workers) {
    cluster.workers[Number(id)].send(reloadMessage);
  }
}

if (!cluster.isMaster) {
  process.on('message', (ipcMessage: IPCMessage) => {
    if (ipcMessage.type === 'geoip_reload') {
      handleAsyncPromise(reloadGeoipDB());
    }
  });
}

export { updateGeoipDB, updateAndReloadGeoipDB };
