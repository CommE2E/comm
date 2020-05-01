// @flow

import { NavigationActions } from 'react-navigation';
import invariant from 'invariant';

import { ActionResultModalRouteName } from './route-names';
import { getGlobalNavContext } from './icky-global';

function displayActionResultModal(message: string) {
  const navContext = getGlobalNavContext();
  invariant(navContext, 'navContext should be set in displayActionResultModal');
  navContext.dispatch(
    NavigationActions.navigate({
      routeName: ActionResultModalRouteName,
      params: { message, preventPresses: true },
    }),
  );
}

export { displayActionResultModal };
