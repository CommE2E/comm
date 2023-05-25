// @flow

import * as React from 'react';

import type { CommunityCreationNavigationProp } from './community-creation-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: CommunityCreationNavigationProp<'CommunityCreationMembers'>,
  +route: NavigationRoute<'CommunityCreationMembers'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityCreationMembers(props: Props): React.Node {
  return null;
}

export default CommunityCreationMembers;
