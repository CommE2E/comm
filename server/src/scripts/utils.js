// @flow

import { getPool } from '../database/database';
import { terminateFirebaseAdmin } from '../push/utils';
import { publisher } from '../socket/redis';

function endScript() {
  getPool().end();
  publisher.end();
  terminateFirebaseAdmin();
}

export { endScript };
