// @flow

import type { RawMessageInfo } from './message-types.js';

export type MessageReportCreationRequest = {
  +messageID: string,
};

export type MessageReportCreationResult = {
  +messageInfo: RawMessageInfo,
};
