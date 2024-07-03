// @flow

import { createSidebarSpec } from './create-sidebar-spec.js';
import { createThreadSpec } from './create-thread-spec.js';
import type { DMOperationSpec } from './dm-op-spec.js';
import { sendTextMessageSpec } from './send-text-message-spec.js';
import { type DMOperationType, dmOperationTypes } from '../../types/dm-ops.js';

export const dmOpSpecs: {
  +[DMOperationType]: DMOperationSpec<any>,
} = Object.freeze({
  [dmOperationTypes.CREATE_THREAD]: createThreadSpec,
  [dmOperationTypes.CREATE_SIDEBAR]: createSidebarSpec,
  [dmOperationTypes.SEND_TEXT_MESSAGE]: sendTextMessageSpec,
});
