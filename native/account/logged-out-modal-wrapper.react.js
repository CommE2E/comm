// @flow

import * as React from 'react';

import LoggedOutModal from './logged-out-modal.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';

type Props = {
  +navigation: RootNavigationProp<'LoggedOutModal'>,
  +route: NavigationRoute<'LoggedOutModal'>,
};

function LoggedOutModalWrapper(props: Props): React.Node {
  return (
    <LoggedOutModal
      navigation={props.navigation}
      route={props.route}
      defaultMode="prompt"
    />
  );
}

export default LoggedOutModalWrapper;
