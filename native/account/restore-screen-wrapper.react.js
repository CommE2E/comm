// @flow

import * as React from 'react';

import LoggedOutModal from './logged-out-modal.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';

type Props = {
  +navigation: SignInNavigationProp<'RestoreScreen'>,
  +route: NavigationRoute<'RestoreScreen'>,
};

function RestoreScreen(props: Props): React.Node {
  return (
    <LoggedOutModal
      navigation={props.navigation}
      route={props.route}
      defaultMode="restore"
    />
  );
}

export default RestoreScreen;
