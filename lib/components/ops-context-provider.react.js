// @flow

import * as React from 'react';

import { OpsContext } from './ops-context.js';
import type { SuperAction } from '../types/redux-types.js';
import { useDispatch } from '../utils/redux-utils.js';

type Props = {
  +children: React.Node,
};

function OpsContextProvider(props: Props): React.Node {
  const { children } = props;

  const dispatch = useDispatch();
  const dispatchWrapper = React.useCallback(
    (action: SuperAction) => {
      dispatch(action);
      return Promise.resolve();
    },
    [dispatch],
  );

  const contextValue = React.useMemo(
    () => ({ dispatch: dispatchWrapper }),
    [dispatchWrapper],
  );

  return (
    <OpsContext.Provider value={contextValue}>{children}</OpsContext.Provider>
  );
}

export { OpsContextProvider };
