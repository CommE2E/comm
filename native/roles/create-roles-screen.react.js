// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { RolesNavigationProp } from './roles-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

export type CreateRolesScreenParams = {
  +threadInfo: ThreadInfo,
  +action: 'create_role' | 'edit_role',
};

type CreateRolesScreenProps = {
  +navigation: RolesNavigationProp<'CreateRolesScreen'>,
  +route: NavigationRoute<'CreateRolesScreen'>,
};

// eslint-disable-next-line no-unused-vars
function CreateRolesScreen(props: CreateRolesScreenProps): React.Node {
  return <></>;
}

export default CreateRolesScreen;
