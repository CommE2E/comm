// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import { type MessageReportCreationResult } from '../message-report-types.js';
import { rawMessageInfoValidator } from '../message-types.js';

export const messageReportCreationResultValidator: TInterface<MessageReportCreationResult> =
  tShape<MessageReportCreationResult>({
    messageInfo: t.maybe(rawMessageInfoValidator),
  });
