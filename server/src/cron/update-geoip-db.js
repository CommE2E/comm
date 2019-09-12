// @flow

import childProcess from 'child_process';
import geoip from 'geoip-lite';

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

async function updateAndReloadGeoipDB(): Promise<void> {
  await updateGeoipDB();
  await reloadGeoipDB();
}

export {
  updateAndReloadGeoipDB,
};
