// @flow

import * as React from 'react';

import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: RootNavigationProp<'RegistrationModal'>,
  +route: NavigationRoute<'RegistrationModal'>,
};
// eslint-disable-next-line no-unused-vars
function RegistrationModal(props: Props): React.Node {
  return undefined;
}

export default RegistrationModal;
