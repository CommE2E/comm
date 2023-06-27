// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { RolesNavigationProp } from './roles-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

export type CommunityRolesScreenParams = {
  +threadInfo: ThreadInfo,
};

type CommunityRolesScreenProps = {
  +navigation: RolesNavigationProp<'CommunityRolesScreen'>,
  +route: NavigationRoute<'CommunityRolesScreen'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityRolesScreen(props: CommunityRolesScreenProps): React.Node {
  return null;
}

export default CommunityRolesScreen;
