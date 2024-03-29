// @flow

import * as React from 'react';

import type { ProfileNavigationProp } from './profile.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: ProfileNavigationProp<'FarcasterAccountSettings'>,
  +route: NavigationRoute<'FarcasterAccountSettings'>,
};

// eslint-disable-next-line no-unused-vars
function FarcasterAccountSettings(props: Props): React.Node {
  return null;
}

export default FarcasterAccountSettings;
