// @flow
import ashoat from 'lib/facts/ashoat.js';

import { createThread } from '../creators/thread-creator.js';
import { createScriptViewer } from '../session/scripts.js';
import { main } from './utils.js';

const testUserID = '';
const numOfThreads = 1000;

async function createThreads(
  n: number,
  spammedUserID: string,
  spammingUserID: string,
): Promise<$ReadOnlyArray<string>> {
  const threads = [];
  const viewer = createScriptViewer(spammingUserID);
  const initialMemberIDs = [spammedUserID];
  const threadRequest = { type: 3, initialMemberIDs, parentThreadID: '1' };

  for (let i = 0; i < n; i++) {
    const threadResponse = await createThread(viewer, threadRequest);
    if (threadResponse.newThreadID) {
      const threadID: string = threadResponse.newThreadID;
      threads.push(threadID);
    }
  }
  return threads;
}

// This script is used to trigger socket crash loop
// Linear issue: https://linear.app/comm/issue/ENG-2075/reproduce-socket-crash-loop-in-production-with-artificial-test-data
// Usage: set testUserID to the user you wish to trigger the crash loop for,
// set iOS physical device networking profile to 3G and run the script,
// open comm on physical device once the script has finnished
// the app should be in a crash loop

async function createManyThreadsToTriggerCrashLoop() {
  await createThreads(numOfThreads, testUserID, ashoat.id);
}

main([createManyThreadsToTriggerCrashLoop]);
