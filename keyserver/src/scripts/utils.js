// @flow

import { endPool } from '../database/database.js';
import { endFirebase, endAPNs } from '../push/providers.js';
import { publisher } from '../socket/redis.js';
import { prefetchAllURLFacts } from '../utils/urls.js';

function endScript() {
  endPool();
  publisher.end();
  endFirebase();
  endAPNs();
}

async function main(functions: $ReadOnlyArray<() => Promise<mixed>>) {
  await prefetchAllURLFacts();
  try {
    for (const f of functions) {
      await f();
    }
  } catch (e) {
    console.warn(e);
  } finally {
    endScript();
  }
}

export { endScript, main };
