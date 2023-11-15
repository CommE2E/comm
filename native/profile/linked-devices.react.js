// @flow

import * as React from 'react';

import type { ProfileNavigationProp } from './profile.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: ProfileNavigationProp<'LinkedDevices'>,
  +route: NavigationRoute<'LinkedDevices'>,
};
// eslint-disable-next-line no-unused-vars
function LinkedDevices(props: Props): React.Node {
  return null;
}

export default LinkedDevices;
