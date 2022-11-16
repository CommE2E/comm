// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import { moveDraftActionType } from 'lib/actions/draft-actions';
import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors';
import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

import { useSelector } from '../redux/redux-utils';
import type { AppState } from '../redux/state-types';

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
