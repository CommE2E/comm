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
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const messageReportCreationRequestInputValidator = tShape({
  messageID: tID,
});

export const messageReportCreationResultValidator: TInterface<MessageReportCreationResult> =
  tShape<MessageReportCreationResult>({ messageInfo: rawMessageInfoValidator });

async function messageReportCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<MessageReportCreationResult> {
  await validateInput(
    viewer,
    messageReportCreationRequestInputValidator,
    input,
  );
  const request: MessageReportCreationRequest = input;

  const rawMessageInfos = await createMessageReport(viewer, request);
  const result = { messageInfo: rawMessageInfos[0] };
  return validateOutput(viewer, messageReportCreationResultValidator, result);
}

export { messageReportCreationResponder };
