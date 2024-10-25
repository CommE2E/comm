// @flow
import * as React from 'react';

import bots from '../facts/bots.js';
import staff from '../facts/staff.js';
import type { DMOperation } from '../types/dm-ops.js';
import { getConfig } from '../utils/config.js';
import { isDev } from '../utils/dev-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function isStaff(userID: string): boolean {
  if (staff.includes(userID)) {
    return true;
  }
  for (const key in bots) {
    const bot = bots[key];
    if (userID === bot.userID) {
      return true;
    }
  }
  return false;
}

function useIsCurrentUserStaff(): boolean {
  const isCurrentUserStaff = useSelector(state =>
    state.currentUserInfo?.id ? isStaff(state.currentUserInfo.id) : false,
  );
  return isCurrentUserStaff;
}

type StaffAlertHook = {
  +showOperationAlertToStaff: (
    description: string,
    operation: DMOperation,
  ) => void,
  +showAlertToStaff: (title: string, message: string) => void,
};

function useStaffAlert(): StaffAlertHook {
  const isCurrentUserStaff = useIsCurrentUserStaff();

  const showAlertToStaff = React.useCallback(
    (title: string, message: string) => {
      if (!isCurrentUserStaff && !isDev) {
        return;
      }
      getConfig().showAlert(title, message);
    },
    [isCurrentUserStaff],
  );

  const showOperationAlertToStaff = React.useCallback(
    (description: string, operation: DMOperation) => {
      showAlertToStaff(description, JSON.stringify(operation));
    },
    [showAlertToStaff],
  );

  return { showOperationAlertToStaff, showAlertToStaff };
}

export { isStaff, useIsCurrentUserStaff, useStaffAlert };
