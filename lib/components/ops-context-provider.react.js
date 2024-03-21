// @flow

import * as React from 'react';
import uuid from 'uuid';

import { OpsContext } from './ops-context.js';
import type { ActionID } from '../types/db-ops-types.js';
import type { SuperAction } from '../types/redux-types.js';
import { useDispatch, useSelector } from '../utils/redux-utils.js';

type Props = {
  +children: React.Node,
};

function OpsContextProvider(props: Props): React.Node {
  const { children } = props;

  const actionsToPromises = React.useRef<Map<ActionID, () => mixed>>(new Map());

  const dispatch = useDispatch();
  const dispatchWrapper = React.useCallback(
    (action: SuperAction) => {
      const actionID = uuid.v4();
      dispatch({
        ...action,
        actionID,
      });
      return new Promise<void>(resolve =>
        actionsToPromises.current.set(actionID, resolve),
      );
    },
    [dispatch],
  );

  const { noOpsActions, queuedOps } = useSelector(state => state.dbOpsStore);
  const prevActionIDs = React.useRef<$ReadOnlySet<ActionID>>(new Set());
  React.useEffect(() => {
    const newActionIDs = new Set(noOpsActions);
    for (const ops of queuedOps) {
      if (ops.actionID) {
        newActionIDs.add(ops.actionID);
      }
    }
    for (const id of prevActionIDs.current) {
      if (!newActionIDs.has(id)) {
        actionsToPromises.current.get(id)?.();
        actionsToPromises.current.delete(id);
      }
    }
    prevActionIDs.current = newActionIDs;
  }, [noOpsActions, queuedOps]);

  const contextValue = React.useMemo(
    () => ({ dispatch: dispatchWrapper }),
    [dispatchWrapper],
  );

  return (
    <OpsContext.Provider value={contextValue}>{children}</OpsContext.Provider>
  );
}

export { OpsContextProvider };
