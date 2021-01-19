// @flow

import type { RawUnsupportedMessageInfo } from '../../types/message/unsupported';
import type { MessageSpec } from './message-spec';

export const unsupportedMessageSpec: MessageSpec<
  null,
  RawUnsupportedMessageInfo,
> = Object.freeze({});
