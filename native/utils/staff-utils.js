// @flow

import { isStaff } from 'lib/shared/staff-utils.js';

import { useSelector } from '../redux/redux-utils.js';

const isStaffRelease = true;

function useIsCurrentUserStaff(): boolean {
  const isCurrentUserStaff = useSelector(state =>
    state.currentUserInfo?.id ? isStaff(state.currentUserInfo.id) : false,
  );
  return isCurrentUserStaff;
}

function useStaffCanSee(): boolean {
  const isCurrentUserStaff = useIsCurrentUserStaff();
  return __DEV__ || isStaffRelease || isCurrentUserStaff;
}

export { isStaffRelease, useIsCurrentUserStaff, useStaffCanSee };
