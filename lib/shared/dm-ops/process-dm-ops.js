// @flow

import _groupBy from 'lodash/fp/groupBy.js';
import * as React from 'react';
import uuid from 'uuid';

import { dmOpSpecs } from './dm-op-specs.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { mergeUpdatesWithMessageInfos } from '../../reducers/message-reducer.js';
import {
  type DMOperation,
  processDMOpsActionType,
  queueDMOpsActionType,
} from '../../types/dm-ops.js';
import { updateTypes } from '../../types/update-types-enum.js';
import { useDispatch, useSelector } from '../../utils/redux-utils.js';

function useProcessDMOperation(): (dmOp: DMOperation) => Promise<void> {
  const fetchMessage = useGetLatestMessageEdit();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const utilities = React.useMemo(
    () => ({
      fetchMessage,
      threadInfos,
    }),
    [fetchMessage, threadInfos],
  );

  const dispatch = useDispatch();
  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  return React.useCallback(
    async (dmOp: DMOperation) => {
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return;
      }
      const processingCheckResult = dmOpSpecs[dmOp.type].canBeProcessed(
        dmOp,
        viewerID,
        utilities,
      );
      if (!processingCheckResult.isProcessingPossible) {
        if (processingCheckResult.reason.type === 'missing_thread') {
          dispatch({
            type: queueDMOpsActionType,
            payload: {
              operation: dmOp,
              threadID: processingCheckResult.reason.threadID,
              timestamp: Date.now(),
            },
          });
        }
        return;
      }
      const { rawMessageInfos, updateInfos } = await dmOpSpecs[
        dmOp.type
      ].processDMOperation(dmOp, viewerID, utilities);

      const { rawMessageInfos: allNewMessageInfos } =
        mergeUpdatesWithMessageInfos(rawMessageInfos, updateInfos);
      const messagesByThreadID = _groupBy(message => message.threadID)(
        allNewMessageInfos,
      );
      for (const threadID in messagesByThreadID) {
        const messagesFromOtherPeers = messagesByThreadID[threadID].filter(
          message => message.creatorID !== viewerID,
        );
        if (messagesFromOtherPeers.length === 0) {
          continue;
        }
        // We take the most recent timestamp to make sure that updates older
        // than it won't flip the status to read.
        const time = Math.max(
          messagesFromOtherPeers.map(message => message.time),
        );
        updateInfos.push({
          type: updateTypes.UPDATE_THREAD_READ_STATUS,
          id: uuid.v4(),
          time,
          threadID,
          unread: true,
        });
      }

      dispatch({
        type: processDMOpsActionType,
        payload: {
          rawMessageInfos,
          updateInfos,
        },
      });
    },
    [dispatch, viewerID, utilities],
  );
}

export { useProcessDMOperation };
