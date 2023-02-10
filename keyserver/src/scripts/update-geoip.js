// @flow

import { updateGeoipDB } from '../cron/update-geoip-db.js';
import { endScript } from './utils.js';

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
