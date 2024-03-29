// @flow

import childProcess from 'child_process';
import cluster from 'cluster';
import geoip from 'geoip-lite';

import { getCommConfig } from 'lib/utils/comm-config.js';
import { ignorePromiseRejections } from 'lib/utils/promises.js';

type GeoIPLicenseConfig = { +key: string };
async function updateGeoipDB(): Promise<void> {
  const geoipLicense = await getCommConfig<GeoIPLicenseConfig>({
    folder: 'secrets',
    name: 'geoip_license',
  });
  if (!geoipLicense) {
    console.log('no keyserver/secrets/geoip_license.json so skipping update');
    return;
  }
  await spawnUpdater(geoipLicense);
}

function spawnUpdater(geoipLicense: GeoIPLicenseConfig): Promise<void> {
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
      ignorePromiseRejections(reloadGeoipDB());
    }
  });
}

export { updateAndReloadGeoipDB };
