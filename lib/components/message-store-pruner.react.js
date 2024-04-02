// @flow

import * as React from 'react';

import { messageStorePruneActionType } from '../actions/message-actions.js';
import {
  nextMessagePruneTimeSelector,
  pruneThreadIDsSelector,
} from '../selectors/message-selector.js';
import { useIsAppForegrounded } from '../shared/lifecycle-utils.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type Props = {
  +frozen?: boolean,
  +activeThreadID: ?string,
};
function MessageStorePruner(props: Props): null {
  const { frozen, activeThreadID } = props;

  const nextMessagePruneTime = useSelector(nextMessagePruneTimeSelector);
  const prevNextMessagePruneTimeRef = React.useRef(nextMessagePruneTime);

  const foreground = useIsAppForegrounded();

  const pruneThreadIDs = useSelector(pruneThreadIDsSelector);

  const prunedRef = React.useRef(false);

  const dispatch = useDispatch();

  React.useEffect(() => {
    if (
      prunedRef.current &&
      nextMessagePruneTime !== prevNextMessagePruneTimeRef.current
    ) {
      prunedRef.current = false;
    }
    prevNextMessagePruneTimeRef.current = nextMessagePruneTime;

    if (frozen || prunedRef.current) {
      return;
    }
    if (nextMessagePruneTime === null || nextMessagePruneTime === undefined) {
      return;
    }
    const timeUntilExpiration = nextMessagePruneTime - Date.now();
    if (timeUntilExpiration > 0) {
      return;
    }
    const threadIDs = pruneThreadIDs(activeThreadID);
    if (threadIDs.length === 0) {
      return;
    }
    prunedRef.current = true;
    dispatch({
      type: messageStorePruneActionType,
      payload: { threadIDs },
    });
    // We include foreground so this effect will be called on foreground
  }, [
    nextMessagePruneTime,
    frozen,
    foreground,
    pruneThreadIDs,
    dispatch,
    activeThreadID,
  ]);

  return null;
}

export default MessageStorePruner;
