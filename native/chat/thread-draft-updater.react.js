// @flow

import invariant from 'invariant';
import * as React from 'react';

import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors';
import { draftKeyFromThreadID } from 'lib/shared/thread-utils';

import type { AppState } from '../redux/redux-setup';
import { useSelector } from '../redux/redux-utils';

type Props = {||};

const ThreadDraftUpdater: React.AbstractComponent<
  Props,
  mixed,
> = React.memo<Props>(() => {
  const pendingToRealizedThreadIDs = useSelector((state: AppState) =>
    pendingToRealizedThreadIDsSelector(state.threadStore.threadInfos),
  );

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
      global.CommCoreModule.moveDraft(
        draftKeyFromThreadID(pendingThreadID),
        draftKeyFromThreadID(threadID),
      );
      cachedThreadIDs.add(threadID);
    }
  }, [pendingToRealizedThreadIDs]);
  return null;
});
ThreadDraftUpdater.displayName = 'ThreadDraftUpdater';

export default ThreadDraftUpdater;
