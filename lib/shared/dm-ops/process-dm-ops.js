// @flow

import * as React from 'react';

import { dmOpSpecs } from './dm-op-specs.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import { useDispatchWithMessageSource } from '../../hooks/ops-hooks.js';
import type { MessageSourceMetadata } from '../../types/db-ops-types.js';
import {
  type DMOperation,
  processDMOpsActionType,
  queueDMOpsActionType,
} from '../../types/dm-ops.js';
import { useSelector } from '../../utils/redux-utils.js';

function useProcessDMOperation(): (
  dmOp: DMOperation,
  metadata: ?MessageSourceMetadata,
) => Promise<void> {
  const fetchMessage = useGetLatestMessageEdit();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const utilities = React.useMemo(
    () => ({
      fetchMessage,
      threadInfos,
    }),
    [fetchMessage, threadInfos],
  );

  const dispatchWithMessageSource = useDispatchWithMessageSource();
  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  return React.useCallback(
    async (dmOp: DMOperation, metadata: ?MessageSourceMetadata) => {
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
          dispatchWithMessageSource(
            {
              type: queueDMOpsActionType,
              payload: {
                operation: dmOp,
                threadID: processingCheckResult.reason.threadID,
                timestamp: Date.now(),
              },
            },
            metadata,
          );
        }
        return;
      }
      const { rawMessageInfos, updateInfos } = await dmOpSpecs[
        dmOp.type
      ].processDMOperation(dmOp, viewerID, utilities);

      dispatchWithMessageSource(
        {
          type: processDMOpsActionType,
          payload: {
            rawMessageInfos,
            updateInfos,
          },
        },
        metadata,
      );
    },
    [viewerID, utilities, dispatchWithMessageSource],
  );
}

export { useProcessDMOperation };
