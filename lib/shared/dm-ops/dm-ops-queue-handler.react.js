// @flow

import _mapValues from 'lodash/fp/mapValues.js';
import * as React from 'react';

import { dmOperationSpecificationTypes } from './dm-op-utils.js';
import { useProcessDMOperation } from './process-dm-ops.js';
import { messageInfoSelector } from '../../selectors/chat-selectors.js';
import {
  entryInfoSelector,
  threadInfoSelector,
} from '../../selectors/thread-selectors.js';
import {
  clearQueuedEntryDMOpsActionType,
  clearQueuedMembershipDMOpsActionType,
  clearQueuedMessageDMOpsActionType,
  clearQueuedThreadDMOpsActionType,
  pruneDMOpsQueueActionType,
} from '../../types/dm-ops.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';

const PRUNING_FREQUENCY = 60 * 60 * 1000;
const FIRST_PRUNING_DELAY = 10 * 60 * 1000;
const QUEUED_OPERATION_TTL = 3 * 24 * 60 * 60 * 1000;

function DMOpsQueueHandler(): React.Node {
  const dispatch = useDispatch();

  const prune = React.useCallback(() => {
    const now = Date.now();
    dispatch({
      type: pruneDMOpsQueueActionType,
      payload: {
        pruneMaxTimestamp: now - QUEUED_OPERATION_TTL,
      },
    });
  }, [dispatch]);

  React.useEffect(() => {
    const timeoutID = setTimeout(prune, FIRST_PRUNING_DELAY);
    const intervalID = setInterval(prune, PRUNING_FREQUENCY);

    return () => {
      clearTimeout(timeoutID);
      clearInterval(intervalID);
    };
  }, [prune]);

  const threadInfos = useSelector(threadInfoSelector);
  const threadIDs = React.useMemo(
    () => new Set(Object.keys(threadInfos)),
    [threadInfos],
  );
  const prevThreadIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedThreadOperations = useSelector(
    state => state.queuedDMOperations.threadQueue,
  );

  const processDMOperation = useProcessDMOperation();

  React.useEffect(() => {
    const prevThreadIDs = prevThreadIDsRef.current;
    prevThreadIDsRef.current = threadIDs;

    for (const threadID in queuedThreadOperations) {
      if (!threadIDs.has(threadID) || prevThreadIDs.has(threadID)) {
        continue;
      }
      for (const dmOp of queuedThreadOperations[threadID]) {
        void processDMOperation({
          // This is `INBOUND` because we assume that when generating
          // `dmOperationSpecificationTypes.OUBOUND` it should be possible
          // to be processed and never queued up.
          type: dmOperationSpecificationTypes.INBOUND,
          op: dmOp.operation,
          // There is no metadata, because messages were confirmed when
          // adding to the queue.
          metadata: null,
        });
      }

      dispatch({
        type: clearQueuedThreadDMOpsActionType,
        payload: {
          threadID,
        },
      });
    }
  }, [dispatch, processDMOperation, queuedThreadOperations, threadIDs]);

  const messageInfos = useSelector(messageInfoSelector);
  const messageIDs = React.useMemo(
    () => new Set(Object.keys(messageInfos)),
    [messageInfos],
  );
  const prevMessageIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedMessageOperations = useSelector(
    state => state.queuedDMOperations.messageQueue,
  );

  React.useEffect(() => {
    const prevMessageIDs = prevMessageIDsRef.current;
    prevMessageIDsRef.current = messageIDs;

    for (const messageID in queuedMessageOperations) {
      if (!messageIDs.has(messageID) || prevMessageIDs.has(messageID)) {
        continue;
      }

      for (const dmOp of queuedMessageOperations[messageID]) {
        void processDMOperation({
          // This is `INBOUND` because we assume that when generating
          // `dmOperationSpecificationTypes.OUBOUND` it should be possible
          // to be processed and never queued up.
          type: dmOperationSpecificationTypes.INBOUND,
          op: dmOp.operation,
          // There is no metadata, because messages were confirmed when
          // adding to the queue.
          metadata: null,
        });
      }

      dispatch({
        type: clearQueuedMessageDMOpsActionType,
        payload: {
          messageID,
        },
      });
    }
  }, [dispatch, messageIDs, processDMOperation, queuedMessageOperations]);

  const entryInfos = useSelector(entryInfoSelector);
  const entryIDs = React.useMemo(
    () => new Set(Object.keys(entryInfos)),
    [entryInfos],
  );
  const prevEntryIDsRef = React.useRef<$ReadOnlySet<string>>(new Set());

  const queuedEntryOperations = useSelector(
    state => state.queuedDMOperations.entryQueue,
  );

  React.useEffect(() => {
    const prevEntryIDs = prevEntryIDsRef.current;
    prevEntryIDsRef.current = entryIDs;

    for (const entryID in queuedEntryOperations) {
      if (!entryIDs.has(entryID) || prevEntryIDs.has(entryID)) {
        continue;
      }

      for (const dmOp of queuedEntryOperations[entryID]) {
        void processDMOperation({
          // This is `INBOUND` because we assume that when generating
          // `dmOperationSpecificationTypes.OUBOUND` it should be possible
          // to be processed and never queued up.
          type: dmOperationSpecificationTypes.INBOUND,
          op: dmOp.operation,
          // There is no metadata, because messages were confirmed when
          // adding to the queue.
          metadata: null,
        });
      }

      dispatch({
        type: clearQueuedEntryDMOpsActionType,
        payload: {
          entryID,
        },
      });
    }
  }, [dispatch, entryIDs, processDMOperation, queuedEntryOperations]);

  const threadMembers = React.useMemo(
    () =>
      _mapValues(thread => new Set(thread.members.map(member => member.id)))(
        threadInfos,
      ),
    [threadInfos],
  );
  const prevThreadMembersRef = React.useRef<{
    +[threadID: string]: $ReadOnlySet<string>,
  }>({});
  const queuedMembershipOperations = useSelector(
    state => state.queuedDMOperations.membershipQueue,
  );

  React.useEffect(() => {
    const prevThreadMembers = prevThreadMembersRef.current;
    prevThreadMembersRef.current = threadMembers;

    for (const threadID in queuedMembershipOperations) {
      if (!threadMembers[threadID]) {
        continue;
      }

      for (const userID in queuedMembershipOperations[threadID]) {
        if (
          !threadMembers[threadID].has(userID) ||
          prevThreadMembers[threadID]?.has(userID)
        ) {
          continue;
        }

        for (const dmOp of queuedMembershipOperations[threadID][userID] ?? {}) {
          void processDMOperation({
            // This is `INBOUND` because we assume that when generating
            // `dmOperationSpecificationTypes.OUBOUND` it should be possible
            // to be processed and never queued up.
            type: dmOperationSpecificationTypes.INBOUND,
            op: dmOp.operation,
            // There is no metadata, because messages were confirmed when
            // adding to the queue.
            metadata: null,
          });
        }

        dispatch({
          type: clearQueuedMembershipDMOpsActionType,
          payload: {
            threadID,
            userID,
          },
        });
      }
    }
  }, [dispatch, processDMOperation, queuedMembershipOperations, threadMembers]);

  return null;
}

export { DMOpsQueueHandler };
