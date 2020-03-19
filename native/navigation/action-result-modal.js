// @flow

import { NavigationActions } from 'react-navigation';

import { dispatch } from '../redux/redux-setup';
import { ActionResultModalRouteName } from './route-names';

function displayActionResultModal(message: string) {
  dispatch({
    // We do this for Flow
    ...NavigationActions.navigate({
      routeName: ActionResultModalRouteName,
      params: { message },
    }),
  });
}

export { displayActionResultModal };
