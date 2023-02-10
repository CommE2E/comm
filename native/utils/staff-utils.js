// @flow

import { useSelector } from 'react-redux';

import { isStaff } from 'lib/shared/user-utils.js';

const isStaffRelease = false;

function useIsCurrentUserStaff(): boolean {
  const isCurrentUserStaff = useSelector(
    state =>
      state.currentUserInfo &&
      state.currentUserInfo.id &&
      isStaff(state.currentUserInfo.id),
  );
  return isCurrentUserStaff;
}

function useStaffCanSee(): boolean {
  const isCurrentUserStaff = useIsCurrentUserStaff();
  return __DEV__ || isStaffRelease || isCurrentUserStaff;
}

export { isStaffRelease, useIsCurrentUserStaff, useStaffCanSee };
