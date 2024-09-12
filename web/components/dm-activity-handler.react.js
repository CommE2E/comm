// @flow

import * as React from 'react';

import useDMActivityHandler from 'lib/handlers/dm-activity-handler.js';

import { useSelector } from '../redux/redux-utils.js';
import { foregroundActiveThreadSelector } from '../selectors/nav-selectors.js';

function DMActivityHandler(): React.Node {
  const activeThread = useSelector(foregroundActiveThreadSelector);
  useDMActivityHandler(activeThread);
  return null;
}

export default DMActivityHandler;
