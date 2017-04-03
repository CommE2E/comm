// @flow

import type { NavigationState } from 'react-navigation';
import { PropTypes as ReactNavigationPropTypes } from 'react-navigation';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from './redux-setup';
import type { Action } from './navigation-setup';

import React from 'react';
import { createStore, applyMiddleware } from 'redux';
import { Provider, connect } from 'react-redux';
import { AppRegistry, Platform, UIManager } from 'react-native';
import { addNavigationHelpers } from 'react-navigation';
import { composeWithDevTools } from 'remote-redux-devtools';
import thunk from 'redux-thunk';
import invariant from 'invariant';

import { registerConfig } from 'lib/utils/config';
import { setCookie } from 'lib/utils/action-utils';

import { RootNavigator } from './navigation-setup';
import { reducer, defaultState } from './redux-setup';
import {
  resolveInvalidatedCookie,
  getNativeCookie,
  setNativeCookie,
} from './account/native-credentials';

type AppProps = {
  navigationState: NavigationState,
  cookie: ?string,
  dispatch: Dispatch<AppState, Action>,
};
class AppWithNavigationState extends React.PureComponent {

  static propTypes = {
    navigationState: ReactNavigationPropTypes.navigationState,
    cookie: React.PropTypes.string,
    dispatch: React.PropTypes.func.isRequired,
  };
  props: AppProps;

  constructor(props: AppProps) {
    super(props);
    this.getInitialNativeCookie().then();
  }

  async getInitialNativeCookie() {
    // In general, when the app starts we preference the cookie from the native
    // store rather than what we have in Redux. The exception is when the cookie
    // in Redux represents a higher level of authentication. This situation can
    // happen if redux-persist persists faster than the native Android cookie
    // manager, which can take up to 10s to persist new cookies.
    const nativeCookie = await getNativeCookie();
    if (
      nativeCookie &&
      (
        nativeCookie.startsWith("user=") ||
        !this.props.cookie ||
        !this.props.cookie.startsWith("user=")
      )
    ) {
      setCookie(this.props.dispatch, this.props.cookie, nativeCookie, null);
    } else if (nativeCookie !== this.props.cookie) {
      invariant(
        this.props.cookie,
        "flow can't tell, but the conditionals guarantee this",
      );
      await setNativeCookie(this.props.cookie);
    }
  }

  render() {
    const navigation = addNavigationHelpers({
      dispatch: this.props.dispatch,
      state: this.props.navigationState,
    });
    return <RootNavigator navigation={navigation} />;
  }

}

let urlPrefix;
if (!__DEV__) {
  urlPrefix = "https://squadcal.org/";
} else if (Platform.OS === "android") {
  // This is a magic IP address that forwards to the emulator's host
  urlPrefix = "http://10.0.2.2/~ashoat/squadcal/";
} else if (Platform.OS === "ios") {
  // Since iOS is simulated and not emulated, we can use localhost
  urlPrefix = "http://localhost/~ashoat/squadcal/";
  // Uncomment below and update IP address if testing on physical device
  //urlPrefix = "http://192.168.1.3/~ashoat/squadcal/";
} else {
  invariant(false, "unsupported platform");
}
registerConfig({
  urlPrefix,
  resolveInvalidatedCookie,
  getNativeCookie,
});

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ConnectedAppWithNavigationState = connect(
  (state: AppState) => ({
    navigationState: state.navInfo.navigationState,
    cookie: state.cookie,
  }),
)(AppWithNavigationState);
const store = createStore(
  reducer,
  defaultState,
  composeWithDevTools(applyMiddleware(thunk)),
);
const App = (props: {}) =>
  <Provider store={store}>
    <ConnectedAppWithNavigationState />
  </Provider>;

AppRegistry.registerComponent('SquadCal', () => App);
