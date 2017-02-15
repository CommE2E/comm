// @flow

import type { NavigationState } from './navigation-setup';
import { navigationState } from './navigation-setup';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState, Action } from './redux-setup';

import React from 'react';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import { AppRegistry } from 'react-native';
import { addNavigationHelpers } from 'react-navigation';

import { AppNavigator } from './navigation-setup';
import { reducer } from './redux-setup';

class AppWithNavigationState extends React.PureComponent {

  static propTypes = {
    navigationState: navigationState,
    dispatch: React.PropTypes.func.isRequired,
  };
  props: {
    navigationState: NavigationState,
    dispatch: Dispatch<AppState, Action>,
  };

  render() {
    const navigation = addNavigationHelpers({
      dispatch: this.props.dispatch,
      state: this.props.navigationState,
    });
    return <AppNavigator navigation={navigation} />;
  }

}

const ConnectedAppWithNavigationState = connect(
  (state: AppState) => ({
    navigationState: state.navInfo.navigationState,
  }),
)(AppWithNavigationState);
const store = createStore(reducer);
const App = (props: {}) =>
  <Provider store={store}>
    <ConnectedAppWithNavigationState />
  </Provider>;

AppRegistry.registerComponent('SquadCal', () => App);
