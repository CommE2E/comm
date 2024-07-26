// @flow

import type { DMOperationSpec } from './dm-op-spec.js';
import type {
  DMChangeRelationshipOperation,
} from '../../types/dm-ops.js';
import type { ClientUpdateInfo } from '../../types/update-types.js';

const changeRelationshipSpec: DMOperationSpec<DMChangeRelationshipOperation> =
  Object.freeze({
    processDMOperation: async (
      dmOperation: DMChangeRelationshipOperation,
      viewerID: string,
    ) => {
      const { editorID, userID, relationship } = dmOperation;

      const updateInfos: Array<ClientUpdateInfo> = [];
      return {
        rawMessageInfos: [],
        updateInfos,
        userInfos: {},
      };
    },
  });

export { changeRelationshipSpec };
