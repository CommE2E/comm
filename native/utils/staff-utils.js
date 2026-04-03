// @flow

import { useIsCurrentUserStaff } from 'lib/shared/staff-utils.js';

const isStaffRelease = true;

function useStaffCanSee(): boolean {
  const isCurrentUserStaff = useIsCurrentUserStaff();
  return __DEV__ || isStaffRelease || isCurrentUserStaff;
}

export { isStaffRelease, useStaffCanSee };
