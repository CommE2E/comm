// @flow

import _debounce from 'lodash/debounce.js';
import * as React from 'react';

import { useSetThreadUnreadStatus } from '../actions/activity-actions.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { getMostRecentNonLocalMessageID } from '../shared/id-utils.js';
import { threadIsPending } from '../shared/thread-utils.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import { useDispatchActionPromise } from '../utils/redux-promise-utils.js';
import { useSelector } from '../utils/redux-utils.js';

const ACTIVITY_UPDATE_DURATION = 5000;

function useNonKeyserverActivityHandler(activeThread: ?string): void {
  const activeThreadInfo = useSelector(state =>
    activeThread ? state.threadStore.threadInfos[activeThread] : null,
  );
  const activeThreadLatestMessage = useSelector(state =>
    activeThread
      ? getMostRecentNonLocalMessageID(activeThread, state.messageStore)
      : null,
  );
  const processAndSendDMOperation = useProcessAndSendDMOperation();

  const prevActiveThreadRef = React.useRef<?string>();
  const prevActiveThreadLatestMessageRef = React.useRef<?string>();

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  const setThreadUnreadStatus = useSetThreadUnreadStatus();
  const updateDMActivity = React.useCallback(async () => {
    if (!activeThreadInfo) {
      return;
    }
    const input = {
      threadInfo: activeThreadInfo,
      threadID: activeThreadInfo.id,
      unread: false,
      latestMessage: activeThreadLatestMessage,
    };
    await setThreadUnreadStatus(input);
  }, [activeThreadInfo, activeThreadLatestMessage, setThreadUnreadStatus]);

  const getUpdateActivityAfterLatestMessageChange = React.useCallback(() => {
    return _debounce(() => {
      if (!activeThread) {
        return;
      }
      void updateDMActivity();
    }, ACTIVITY_UPDATE_DURATION);
  }, [activeThread, updateDMActivity]);

  const dispatchActionPromise = useDispatchActionPromise();

  const updateActivityAfterLatestMessageChangeRef = React.useRef(
    getUpdateActivityAfterLatestMessageChange(),
  );

  React.useEffect(() => {
    const prevActiveThread = prevActiveThreadRef.current;
    const prevActiveThreadLatestMessage =
      prevActiveThreadLatestMessageRef.current;

    prevActiveThreadRef.current = activeThread;
    prevActiveThreadLatestMessageRef.current = activeThreadLatestMessage;

    const activeThreadChanged = prevActiveThread !== activeThread;
    if (activeThreadChanged) {
      updateActivityAfterLatestMessageChangeRef.current =
        getUpdateActivityAfterLatestMessageChange();
    }

    if (
      !viewerID ||
      !activeThread ||
      !activeThreadInfo ||
      !threadSpecs[activeThreadInfo.type].protocol()
        .threadActivityUpdatedByActivityHandlerOnly ||
      threadIsPending(activeThread)
    ) {
      return;
    }

    const threadHandledByHandlerOnly =
      threadSpecs[activeThreadInfo.type].protocol()
        .threadActivityUpdatedByActivityHandlerOnly;
    const alwaysUpdateActivity =
      threadSpecs[activeThreadInfo.type].protocol().alwaysUpdateThreadActivity;
    const activityShouldBeRecorded =
      threadHandledByHandlerOnly || alwaysUpdateActivity;

    if (!activityShouldBeRecorded) {
      return;
    }

    if (activeThreadInfo.currentUser.unread) {
      void updateDMActivity();
      return;
    }

    if (
      !alwaysUpdateActivity &&
      (activeThreadChanged ||
        activeThreadLatestMessage === prevActiveThreadLatestMessage)
    ) {
      return;
    }

    updateActivityAfterLatestMessageChangeRef.current();
  }, [
    updateDMActivity,
    dispatchActionPromise,
    activeThread,
    viewerID,
    processAndSendDMOperation,
    activeThreadInfo,
    activeThreadLatestMessage,
    getUpdateActivityAfterLatestMessageChange,
  ]);
}

export default useNonKeyserverActivityHandler;
