// @flow

import * as React from 'react';

import { dmOpSpecs } from './dm-op-specs.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import { useGetLatestMessageEdit } from '../../hooks/latest-message-edit.js';
import type { DMOperation } from '../../types/dm-ops.js';

function useProcessDMOperation(): (dmOp: DMOperation) => Promise<void> {
  const fetchMessage = useGetLatestMessageEdit();
  const utilities = React.useMemo(
    () => ({
      fetchMessage,
    }),
    [fetchMessage],
  );

  const loggedInUserInfo = useLoggedInUserInfo();
  const viewerID = loggedInUserInfo?.id;
  return React.useCallback(
    async (dmOp: DMOperation) => {
      if (!viewerID) {
        console.log('ignored DMOperation because logged out');
        return;
      }
      await dmOpSpecs[dmOp.type].processDMOperation(dmOp, viewerID, utilities);
      // TODO: dispatch Redux action
    },
    [viewerID, utilities],
  );
}

export { useProcessDMOperation };
