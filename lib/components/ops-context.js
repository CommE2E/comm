// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { SuperAction } from '../types/redux-types.js';

export type OpsContextType = {
  +dispatch: (action: SuperAction) => Promise<void>,
};

const OpsContext: React.Context<?OpsContextType> = React.createContext(null);

function useAwaitableDispatch(): (action: SuperAction) => Promise<void> {
  const context = React.useContext(OpsContext);
  invariant(context, 'Ops context should be set');
  return context.dispatch;
}

export { OpsContext, useAwaitableDispatch };
