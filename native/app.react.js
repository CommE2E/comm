// @flow

import type { NavigationState } from 'react-navigation';
import { ReactNavigationPropTypes } from 'react-navigation';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState, Action } from './redux-setup';

import React from 'react';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import { AppRegistry } from 'react-native';
import { addNavigationHelpers } from 'react-navigation';
import { composeWithDevTools } from 'remote-redux-devtools';
import thunk from 'redux-thunk';

import { RootNavigator } from './navigation-setup';
import { reducer } from './redux-setup';

class AppWithNavigationState extends React.PureComponent {

  static propTypes = {
    navigationState: ReactNavigationPropTypes.navigationState,
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
    return <RootNavigator navigation={navigation} />;
  }

}

const ConnectedAppWithNavigationState = connect(
  (state: AppState) => ({
    navigationState: state.navInfo.navigationState,
  }),
)(AppWithNavigationState);
const store = createStore(
  reducer,
  composeWithDevTools(applyMiddleware(thunk)),
);
const App = (props: {}) =>
  <Provider store={store}>
    <ConnectedAppWithNavigationState />
  </Provider>;

AppRegistry.registerComponent('SquadCal', () => App);
