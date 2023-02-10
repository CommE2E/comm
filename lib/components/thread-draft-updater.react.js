// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { moveDraftActionType } from '../actions/draft-actions.js';
import { pendingToRealizedThreadIDsSelector } from '../selectors/thread-selectors.js';
import { draftKeyFromThreadID } from '../shared/thread-utils.js';
import type { AppState } from '../types/redux-types.js';
import { useSelector } from '../utils/redux-utils.js';

const ThreadDraftUpdater: React.ComponentType<{}> = React.memo<{}>(
  function ThreadDraftUpdater() {
    const pendingToRealizedThreadIDs = useSelector((state: AppState) =>
      pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
    );
    const dispatch = useDispatch();

    const cachedThreadIDsRef = React.useRef();
    if (!cachedThreadIDsRef.current) {
      const newCachedThreadIDs = new Set();
      for (const realizedThreadID of pendingToRealizedThreadIDs.values()) {
        newCachedThreadIDs.add(realizedThreadID);
      }
      cachedThreadIDsRef.current = newCachedThreadIDs;
    }

    React.useEffect(() => {
      for (const [pendingThreadID, threadID] of pendingToRealizedThreadIDs) {
        const cachedThreadIDs = cachedThreadIDsRef.current;
        invariant(cachedThreadIDs, 'should be set');
        if (cachedThreadIDs.has(threadID)) {
          continue;
        }
        dispatch({
          type: moveDraftActionType,
          payload: {
            oldKey: draftKeyFromThreadID(pendingThreadID),
            newKey: draftKeyFromThreadID(threadID),
          },
        });
        cachedThreadIDs.add(threadID);
      }
    }, [pendingToRealizedThreadIDs, dispatch]);
    return null;
  },
);
ThreadDraftUpdater.displayName = 'ThreadDraftUpdater';

export default ThreadDraftUpdater;
