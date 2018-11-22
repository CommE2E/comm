// @flow

import type { BaseAppState } from '../types/redux-types';
import { messageTypes } from '../types/message-types';

import invariant from 'invariant';

const localIDExtractionRegex = /^local([0-9]+)$/;

function numberFromLocalID(localID: string) {
  const matches = localIDExtractionRegex.exec(localID);
  invariant(matches && matches[1], `${localID} doesn't look like a localID`);
  return parseInt(matches[1]);
}

function highestLocalIDSelector(state: BaseAppState<*>): number {
  let highestLocalIDFound = -1;

  if (state && state.messageStore) {
    for (let messageKey in state.messageStore.messages) {
      const messageInfo = state.messageStore.messages[messageKey];
      if (messageInfo.type !== messageTypes.TEXT) {
        continue;
      }
      const localID = messageInfo.localID;
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
    for (let entryKey in state.entryStore.entryInfos) {
      const localID = state.entryStore.entryInfos[entryKey].localID;
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

export {
  numberFromLocalID,
  highestLocalIDSelector,
};
