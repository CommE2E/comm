// @flow

import ashoat from 'lib/facts/ashoat.js';

import { main } from './utils.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';

const viewer = createScriptViewer(ashoat.id);

async function testThreadStoreReductions() {
  const { threadInfos } = await fetchThreadInfos(viewer);
  const beforeReductions = JSON.stringify(threadInfos);
  const beforeBytes = new Blob([beforeReductions]).size;
  console.log(
    `before reductions, Ashoat's ThreadStore is ${beforeBytes} bytes large`,
  );
}

main([testThreadStoreReductions]);
