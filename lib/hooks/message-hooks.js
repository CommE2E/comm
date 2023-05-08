// @flow

import { getOldestNonLocalMessageID } from '../shared/message-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useOldestMessageServerID(threadID: string): ?string {
  return useSelector(state =>
    getOldestNonLocalMessageID(threadID, state.messageStore),
  );
}

export { useOldestMessageServerID };
