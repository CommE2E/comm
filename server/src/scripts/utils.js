// @flow

import { pool } from '../database';
import { publisher } from '../socket/redis';

function endScript() {
  pool.end();
  publisher.end();
}

export {
  endScript,
};
