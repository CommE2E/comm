// @flow

import invariant from 'invariant';
import * as React from 'react';

import { locallyUniqueToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors';
import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

import { useDrafts } from '../data/core-data';
import { useSelector } from '../redux/redux-utils';
import type { AppState } from '../redux/state-types';

const ThreadDraftUpdater: React.ComponentType<{}> = React.memo<{}>(
  function ThreadDraftUpdater() {
    const locallyUniqueToRealizedThreadIDs = useSelector((state: AppState) =>
      locallyUniqueToRealizedThreadIDsSelector(state.threadStore.threadInfos),
    );
    const drafts = useDrafts();

    const cachedThreadIDsRef = React.useRef();
    if (!cachedThreadIDsRef.current) {
      const newCachedThreadIDs = new Set();
      for (const realizedThreadID of locallyUniqueToRealizedThreadIDs.values()) {
        newCachedThreadIDs.add(realizedThreadID);
      }
      cachedThreadIDsRef.current = newCachedThreadIDs;
    }

    const { moveDraft } = drafts;
    React.useEffect(() => {
      for (const [
        locallyUniqueThreadID,
        threadID,
      ] of locallyUniqueToRealizedThreadIDs) {
        const cachedThreadIDs = cachedThreadIDsRef.current;
        invariant(cachedThreadIDs, 'should be set');
        if (cachedThreadIDs.has(threadID)) {
          continue;
        }
        moveDraft(
          draftKeyFromThreadID(locallyUniqueThreadID),
          draftKeyFromThreadID(threadID),
        );
        cachedThreadIDs.add(threadID);
      }
    }, [locallyUniqueToRealizedThreadIDs, moveDraft]);
    return null;
  },
);
ThreadDraftUpdater.displayName = 'ThreadDraftUpdater';

export default ThreadDraftUpdater;
