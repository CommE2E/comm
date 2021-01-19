// @flow

import type { ChangeRoleMessageData } from '../../types/message/change-role';
import type { MessageSpec } from './message-spec';

export const changeRoleMessageSpec: MessageSpec<ChangeRoleMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify({
        userIDs: data.userIDs,
        newRole: data.newRole,
      });
    },
  },
);
