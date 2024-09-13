// @flow

import { useIsCurrentUserStaff } from '../shared/staff-utils.js';
import { isDev } from '../utils/dev-utils.js';

// If this returns true, then DM creation will use E2EE DMs encrypted via Olm
// and brokered by Tunnelbroker, instead of creating chats under GENESIS on the
// authoritative keyserver.
function useAllowOlmViaTunnelbrokerForDMs(): boolean {
  const isCurrentUserStaff = useIsCurrentUserStaff();
  return isDev || isCurrentUserStaff;
}

export { useAllowOlmViaTunnelbrokerForDMs };
