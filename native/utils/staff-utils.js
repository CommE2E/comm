// @flow

import { useSelector } from 'react-redux';

import { isStaff } from 'lib/shared/user-utils';

const isStaffRelease = false;

function useStaffCanSee(): boolean {
  const isCurrentUserStaff = useSelector(
    state =>
      state.currentUserInfo &&
      state.currentUserInfo.id &&
      isStaff(state.currentUserInfo.id),
  );
  return __DEV__ || isStaffRelease || isCurrentUserStaff;
}

export { isStaffRelease, useStaffCanSee };
