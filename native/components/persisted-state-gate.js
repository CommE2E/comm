// @flow

import * as React from 'react';

import { usePersistedStateLoaded } from '../selectors/app-state-selectors';

function PersistedStateGate(props: { +children: React.Node }): React.Node {
  const persistedStateLoaded = usePersistedStateLoaded();
  if (!persistedStateLoaded) {
    return null;
  }

  return props.children;
}

export default PersistedStateGate;
