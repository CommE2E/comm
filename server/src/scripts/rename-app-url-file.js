// @flow

import * as fs from 'fs';

import { main } from './utils';

async function rename_app_url_as_squadcal_url() {
  await fs.rename('facts/app_url.json', 'facts/squadcal_url.json', err => {
    if (err) {
      throw err;
    }
  });
}

main([rename_app_url_as_squadcal_url]);
