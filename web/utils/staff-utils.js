// @flow

import { useIsCurrentUserStaff } from 'lib/shared/staff-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';

function useStaffCanSee(): boolean {
  const isCurrentUserStaff = useIsCurrentUserStaff();
  return isDev || isCurrentUserStaff;
}

export { useStaffCanSee };
