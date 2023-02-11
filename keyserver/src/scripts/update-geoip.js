// @flow

import { endScript } from './utils.js';
import { updateGeoipDB } from '../cron/update-geoip-db.js';

async function main() {
  try {
    await updateGeoipDB();
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

main();
