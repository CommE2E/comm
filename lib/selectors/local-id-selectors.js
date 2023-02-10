// @flow

import invariant from 'invariant';

import type { BaseAppState } from '../types/redux-types.js';

const localIDExtractionRegex = /^local([0-9]+)$/;

function numberFromLocalID(localID: string): number {
  const matches = localIDExtractionRegex.exec(localID);
  invariant(matches && matches[1], `${localID} doesn't look like a localID`);
  return parseInt(matches[1], 10);
}

function highestLocalIDSelector(state: ?BaseAppState<*>): number {
  let highestLocalIDFound = -1;

  if (state && state.messageStore) {
    for (const messageKey in state.messageStore.messages) {
      const messageInfo = state.messageStore.messages[messageKey];
      if (!messageInfo.localID) {
        continue;
      }
      const { localID } = messageInfo;
      if (!localID) {
        continue;
      }
      const thisLocalID = numberFromLocalID(localID);
      if (thisLocalID > highestLocalIDFound) {
        highestLocalIDFound = thisLocalID;
      }
    }
  }

  if (state && state.entryStore) {
    for (const entryKey in state.entryStore.entryInfos) {
      const { localID } = state.entryStore.entryInfos[entryKey];
      if (!localID) {
        continue;
      }
      const thisLocalID = numberFromLocalID(localID);
      if (thisLocalID > highestLocalIDFound) {
        highestLocalIDFound = thisLocalID;
      }
    }
  }

  return highestLocalIDFound;
}

export { numberFromLocalID, highestLocalIDSelector };
