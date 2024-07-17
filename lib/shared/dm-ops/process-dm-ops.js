// @flow

import * as React from 'react';

import { dmOpSpecs } from './dm-op-specs.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import {
  type DMOperation,
  processDMOpsActionType,
} from '../../types/dm-ops.js';
import { useDispatch } from '../../utils/redux-utils.js';

function useProcessDMOperation(): (dmOp: DMOperation) => Promise<void> {
  const fetchMessage = useGetLatestMessageEdit();
  const utilities = React.useMemo(
    () => ({
      fetchMessage,
    }),
    [fetchMessage],
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
      const { rawMessageInfos, updateInfos } = await dmOpSpecs[
        dmOp.type
      ].processDMOperation(dmOp, viewerID, utilities);
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
