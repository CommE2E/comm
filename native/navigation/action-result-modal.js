// @flow

import { CommonActions } from '@react-navigation/native';
import invariant from 'invariant';

import { getGlobalNavContext } from './icky-global.js';
import { ActionResultModalRouteName } from './route-names.js';

function displayActionResultModal(message: string) {
  const navContext = getGlobalNavContext();
  invariant(navContext, 'navContext should be set in displayActionResultModal');
  navContext.dispatch(
    CommonActions.navigate({
      name: ActionResultModalRouteName,
      params: { message, preventPresses: true },
    }),
  );
}

export { displayActionResultModal };
