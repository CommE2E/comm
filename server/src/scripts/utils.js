// @flow

import { getPool } from '../database/database';
import { endFirebase, endAPNs } from '../push/utils';
import { publisher } from '../socket/redis';

function endScript() {
  getPool().end();
  publisher.end();
  endFirebase();
  endAPNs();
}

export { endScript };
