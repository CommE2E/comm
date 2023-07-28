// @flow

import type { TInterface } from 'tcomb';

import {
  type MessageReportCreationRequest,
  type MessageReportCreationResult,
} from 'lib/types/message-report-types.js';
import { rawMessageInfoValidator } from 'lib/types/message-types.js';
import { tShape, tID } from 'lib/utils/validation-utils.js';

import createMessageReport from '../creators/message-report-creator.js';
import type { Viewer } from '../session/viewer.js';

export const messageReportCreationRequestInputValidator: TInterface<MessageReportCreationRequest> =
  tShape<MessageReportCreationRequest>({
    messageID: tID,
  });

export const messageReportCreationResultValidator: TInterface<MessageReportCreationResult> =
  tShape<MessageReportCreationResult>({ messageInfo: rawMessageInfoValidator });

async function messageReportCreationResponder(
  viewer: Viewer,
  request: MessageReportCreationRequest,
): Promise<MessageReportCreationResult> {
  const rawMessageInfos = await createMessageReport(viewer, request);
  return { messageInfo: rawMessageInfos[0] };
}

export { messageReportCreationResponder };
