// @flow

import * as React from 'react';

import { updateThreadLastNavigatedActionType } from 'lib/types/thread-activity-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { useActiveMessageList } from './nav-selectors.js';

const ThreadScreenTracker: React.ComponentType<{}> = React.memo<{}, void>(
  function ThreadScreenTracker() {
    const activeThread = useActiveMessageList();
    const reduxDispatch = useDispatch();

    React.useEffect(() => {
      if (activeThread) {
        reduxDispatch({
          type: updateThreadLastNavigatedActionType,
          payload: {
            threadID: activeThread,
            time: Date.now(),
          },
        });
      }
    }, [activeThread, reduxDispatch]);

    return null;
  },
);
ThreadScreenTracker.displayName = 'ThreadScreenTracker';

export default ThreadScreenTracker;
