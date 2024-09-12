// @flow

import * as React from 'react';

import useDMActivityHandler from 'lib/handlers/dm-activity-handler.js';

import { useForegroundActiveThread } from '../navigation/nav-selectors.js';

function DMActivityHandler(): React.Node {
  const activeThread = useForegroundActiveThread();
  useDMActivityHandler(activeThread);
  return null;
}

export default DMActivityHandler;
