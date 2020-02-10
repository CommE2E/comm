// @flow

import { endScript } from './utils';
import { updateGeoipDB } from '../cron/update-geoip-db';

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
