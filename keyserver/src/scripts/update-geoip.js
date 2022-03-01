// @flow

import { updateGeoipDB } from '../cron/update-geoip-db';
import { endScript } from './utils';

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
