// @flow

import type { FetchJSON } from '../utils/fetch-json';

const pingActionType = "PING";
async function ping(fetchJSON: FetchJSON): Promise<void> {
  await fetchJSON('ping.php', {});
}

export {
  pingActionType,
  ping,
}
