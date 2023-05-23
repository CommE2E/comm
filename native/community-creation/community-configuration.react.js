// @flow

import * as React from 'react';

import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import { type NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: CommunityCreationNavigationProp<'CommunityConfiguration'>,
  +route: NavigationRoute<'CommunityConfiguration'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityConfiguration(props: Props): React.Node {
  return null;
}

export default CommunityConfiguration;
