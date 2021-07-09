// @flow

import invariant from 'invariant';
import * as React from 'react';

import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors';
import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

import { useDrafts } from '../data/core-data';
import type { AppState } from '../redux/state-types';
import { useSelector } from '../redux/redux-utils';

type Props = {||};

const ThreadDraftUpdater: React.AbstractComponent<
  Props,
  mixed,
> = React.memo<Props>(() => {
  const pendingToRealizedThreadIDs = useSelector((state: AppState) =>
    pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
  );
  const drafts = useDrafts();

  const cachedThreadIDsRef = React.useRef();
  if (!cachedThreadIDsRef.current) {
    const newCachedThreadIDs = new Set();
    for (const realizedThreadID of pendingToRealizedThreadIDs.values()) {
      newCachedThreadIDs.add(realizedThreadID);
    }
    cachedThreadIDsRef.current = newCachedThreadIDs;
  }

  const { moveDraft } = drafts;
  React.useEffect(() => {
    for (const [pendingThreadID, threadID] of pendingToRealizedThreadIDs) {
      const cachedThreadIDs = cachedThreadIDsRef.current;
      invariant(cachedThreadIDs, 'should be set');
      if (cachedThreadIDs.has(threadID)) {
        continue;
      }
      moveDraft(
        draftKeyFromThreadID(pendingThreadID),
        draftKeyFromThreadID(threadID),
      );
      cachedThreadIDs.add(threadID);
    }
  }, [pendingToRealizedThreadIDs, moveDraft]);
  return null;
});
ThreadDraftUpdater.displayName = 'ThreadDraftUpdater';

export default ThreadDraftUpdater;
