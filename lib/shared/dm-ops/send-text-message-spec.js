// @flow

import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMSendTextMessageOperation } from '../../types/dm-ops.js';

export const sendTextMessageSpec: DMOperationSpec<DMSendTextMessageOperation> =
  Object.freeze({
    processDMOperation: async () => {
      return {
        rawMessageInfos: [],
        updateInfos: [],
      };
    },
  });
