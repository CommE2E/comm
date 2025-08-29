// @flow

import * as React from 'react';

import useNonKeyserverActivityHandler from 'lib/handlers/non-keyserver-activity-handler.js';

import { useForegroundActiveThread } from '../navigation/nav-selectors.js';

function NonKeyserverActivityHandler(): React.Node {
  const activeThread = useForegroundActiveThread();
  useNonKeyserverActivityHandler(activeThread);
  return null;
}

export default NonKeyserverActivityHandler;
