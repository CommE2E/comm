// @flow

import * as React from 'react';

import { dmOpSpecs } from './dm-op-specs.js';
import { useLoggedInUserInfo } from '../../hooks/account-hooks.js';
import type { DMOperation } from '../../types/dm-ops.js';
import { getConfig } from '../../utils/config.js';
import { translateClientDBMessageInfoToRawMessageInfo } from '../../utils/message-ops-utils.js';

function useProcessDMOperation(): (dmOp: DMOperation) => Promise<void> {
  const { getLatestMessageEdit } = getConfig().sqliteAPI;
  const fetchMessage = React.useCallback(
    async (messageID: string) => {
      const latestMessageEdit = await getLatestMessageEdit(messageID);
      if (!latestMessageEdit) {
        return latestMessageEdit;
      }
      return translateClientDBMessageInfoToRawMessageInfo(latestMessageEdit);
    },
    [getLatestMessageEdit],
  );

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
