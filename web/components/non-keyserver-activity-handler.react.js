// @flow

import * as React from 'react';

import useNonKeyserverActivityHandler from 'lib/handlers/non-keyserver-activity-handler.js';

import { useSelector } from '../redux/redux-utils.js';
import { foregroundActiveThreadSelector } from '../selectors/nav-selectors.js';

function NonKeyserverActivityHandler(): React.Node {
  const activeThread = useSelector(foregroundActiveThreadSelector);
  useNonKeyserverActivityHandler(activeThread);
  return null;
}

export default NonKeyserverActivityHandler;
