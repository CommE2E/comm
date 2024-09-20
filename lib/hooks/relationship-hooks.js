// @flow

import * as React from 'react';

import { updateRelationships as serverUpdateRelationships } from '../actions/relationship-actions.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import type {
  RelationshipAction,
  RelationshipErrors,
} from '../types/relationship-types.js';

function useUpdateRelationships(): (
  action: RelationshipAction,
  userIDs: $ReadOnlyArray<string>,
) => Promise<RelationshipErrors> {
  const updateRelationships = useLegacyAshoatKeyserverCall(
    serverUpdateRelationships,
  );
  return React.useCallback(
    (action: RelationshipAction, userIDs: $ReadOnlyArray<string>) =>
      updateRelationships({
        action,
        users: Object.fromEntries(
          userIDs.map(userID => [
            userID,
            {
              createRobotextInThinThread: true,
            },
          ]),
        ),
      }),
    [updateRelationships],
  );
}

export { useUpdateRelationships };
