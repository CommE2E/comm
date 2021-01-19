// @flow

import type { ChangeSettingsMessageData } from '../../types/message/change-settings';
import type { MessageSpec } from './message-spec';

export const changeSettingsMessageSpec: MessageSpec<ChangeSettingsMessageData> = Object.freeze(
  {
    messageContent(data) {
      return JSON.stringify({
        [data.field]: data.value,
      });
    },
  },
);
