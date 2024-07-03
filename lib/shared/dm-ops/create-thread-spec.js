// @flow

import type { DMOperationSpec } from './dm-op-spec.js';
import type { DMCreateThreadOperation } from '../../types/dm-ops.js';

export const createThreadSpec: DMOperationSpec<DMCreateThreadOperation> =
  Object.freeze({
    processDMOperation: async () => {
      return {
        rawMessageInfos: [],
        updateInfos: [],
      };
    },
  });
