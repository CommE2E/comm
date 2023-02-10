// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import {
  updateActivityActionTypes,
  updateActivity,
} from '../actions/activity-actions.js';
import { getMostRecentNonLocalMessageID } from '../shared/message-utils.js';
import { queueActivityUpdatesActionType } from '../types/activity-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from '../utils/action-utils.js';
import { useSelector } from '../utils/redux-utils.js';

type Props = {
  +activeThread: ?string,
  +frozen: boolean,
};
function ActivityHandler(props: Props): React.Node {
  const { activeThread, frozen } = props;

  const prevActiveThreadRef = React.useRef();
  React.useEffect(() => {
    prevActiveThreadRef.current = activeThread;
  }, [activeThread]);
  const prevActiveThread = prevActiveThreadRef.current;

  const connection = useSelector(state => state.connection);
  const connectionStatus = connection.status;
  const prevConnectionStatusRef = React.useRef();
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
  const prevActiveThreadLatestMessageRef = React.useRef();
  React.useEffect(() => {
    prevActiveThreadLatestMessageRef.current = activeThreadLatestMessage;
  }, [activeThreadLatestMessage]);
  const prevActiveThreadLatestMessage =
    prevActiveThreadLatestMessageRef.current;

  const canSend = connectionStatus === 'connected' && !frozen;
  const prevCanSendRef = React.useRef();
  React.useEffect(() => {
    prevCanSendRef.current = canSend;
  }, [canSend]);
  const prevCanSend = prevCanSendRef.current;

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const callUpdateActivity = useServerCall(updateActivity);

  React.useEffect(() => {
    const activityUpdates = [];
    if (activeThread !== prevActiveThread) {
      if (prevActiveThread) {
        activityUpdates.push({
          focus: false,
          threadID: prevActiveThread,
          latestMessage: prevActiveThreadLatestMessage,
        });
      }
      if (activeThread) {
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
      activeThread
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
      callUpdateActivity(activityUpdates),
    );
  });

  return null;
}

export default ActivityHandler;
