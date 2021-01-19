// @flow

import type { TextMessageData } from '../../types/message/text';
import type { MessageSpec } from './message-spec';

export const textMessageSpec: MessageSpec<TextMessageData> = Object.freeze({
  messageContent(data) {
    return data.text;
  },
});
