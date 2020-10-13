// @flow

import { getPool } from '../database/database';
import { publisher } from '../socket/redis';

function endScript() {
  getPool().end();
  publisher.end();
}

export { endScript };
