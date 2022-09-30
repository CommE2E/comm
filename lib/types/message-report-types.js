// @flow

import type { RawMessageInfo } from './message-types';

export type MessageReportCreationRequest = {
  +messageID: string,
};

export type MessageReportCreationResult = {
  +messageInfo: RawMessageInfo,
};
