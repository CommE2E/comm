// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  updateActivityActionTypes,
  useUpdateActivity,
} from '../actions/activity-actions.js';
import { connectionSelector } from '../selectors/keyserver-selectors.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { threadIsPending } from '../shared/thread-utils.js';
import {
  queueActivityUpdatesActionType,
  type ActivityUpdate,
} from '../types/activity-types.js';
import type { ConnectionStatus } from '../types/socket-types.js';
import { useDispatchActionPromise } from '../utils/action-utils.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

type Props = {
  +activeThread: ?string,
  +frozen: boolean,
};
function ActivityHandler(props: Props): React.Node {
  const { activeThread, frozen } = props;

  const prevActiveThreadRef = React.useRef<?string>();
  React.useEffect(() => {
    prevActiveThreadRef.current = activeThread;
  }, [activeThread]);
  const prevActiveThread = prevActiveThreadRef.current;

  const connection = useSelector(connectionSelector(ashoatKeyserverID));
  invariant(connection, 'keyserver missing from keyserverStore');
  const connectionStatus = connection.status;
  const prevConnectionStatusRef = React.useRef<?ConnectionStatus>();
  React.useEffect(() => {
    prevConnectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);
  const prevConnectionStatus = prevConnectionStatusRef.current;

  const activeThreadLatestMessage = useSelector(state => {
    if (!activeThread) {
      return undefined;
    }
    return getMostRecentNonLocalMessageID(activeThread, state.messageStore);
  });
  const prevActiveThreadLatestMessageRef = React.useRef<?string>();
  React.useEffect(() => {
    prevActiveThreadLatestMessageRef.current = activeThreadLatestMessage;
  }, [activeThreadLatestMessage]);
  const prevActiveThreadLatestMessage =
    prevActiveThreadLatestMessageRef.current;

  const canSend = connectionStatus === 'connected' && !frozen;
  const prevCanSendRef = React.useRef<?boolean>();
  React.useEffect(() => {
    prevCanSendRef.current = canSend;
  }, [canSend]);
  const prevCanSend = prevCanSendRef.current;

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const callUpdateActivity = useUpdateActivity();

  React.useEffect(() => {
    const activityUpdates: ActivityUpdate[] = [];
    const isActiveThreadPending = threadIsPending(activeThread);

    if (activeThread !== prevActiveThread) {
      const isPrevActiveThreadPending = threadIsPending(prevActiveThread);

      if (prevActiveThread && !isPrevActiveThreadPending) {
        activityUpdates.push({
          focus: false,
          threadID: prevActiveThread,
          latestMessage: prevActiveThreadLatestMessage,
        });
      }
      if (activeThread && !isActiveThreadPending) {
        activityUpdates.push({
          focus: true,
          threadID: activeThread,
          latestMessage: activeThreadLatestMessage,
        });
      }
    }

    if (
      !frozen &&
      connectionStatus !== 'connected' &&
      prevConnectionStatus === 'connected' &&
      activeThread &&
      !isActiveThreadPending
    ) {
      // When the server closes a socket it also deletes any activity rows
      // associated with that socket's session. If that activity is still
      // ongoing, we should make sure that we clarify that with the server once
      // we reconnect.
      activityUpdates.push({
        focus: true,
        threadID: activeThread,
        latestMessage: activeThreadLatestMessage,
      });
    }

    if (activityUpdates.length > 0) {
      dispatch({
        type: queueActivityUpdatesActionType,
        payload: { activityUpdates },
      });
    }

    if (!canSend) {
      return;
    }

    if (!prevCanSend) {
      activityUpdates.unshift(...connection.queuedActivityUpdates);
    }

    if (activityUpdates.length === 0) {
      return;
    }
    dispatchActionPromise(
      updateActivityActionTypes,
      callUpdateActivity({ activityUpdates }),
    );
  });

  return null;
}

export default ActivityHandler;
