// @flow

import t from 'tcomb';

import {
  type MessageReportCreationRequest,
  type MessageReportCreationResult,
} from 'lib/types/message-report-types';
import { tShape } from 'lib/utils/validation-utils';

import createMessageReport from '../creators/message-report-creator';
import type { Viewer } from '../session/viewer';
import { validateInput } from '../utils/validation-utils';

const messageReportCreationRequestInputValidator = tShape({
  messageID: t.String,
});

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
  return { messageInfo: rawMessageInfos[0] };
}

export { messageReportCreationResponder };
