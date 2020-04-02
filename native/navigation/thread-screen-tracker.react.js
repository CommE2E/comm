// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { useActiveMessageList } from './nav-selectors';
import { updateThreadLastNavigatedActionType } from '../redux/action-types';

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
}

export default ThreadScreenTracker;
