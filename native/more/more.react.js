// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { createStackNavigator } from 'react-navigation-stack';

import MoreScreen from './more-screen.react';
import EditEmail from './edit-email.react';
import EditPassword from './edit-password.react';
import DeleteAccount from './delete-account.react';
import BuildInfo from './build-info.react';
import DevTools from './dev-tools.react';
import AppearancePreferences from './appearance-preferences.react';
import {
  MoreScreenRouteName,
  EditEmailRouteName,
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
} from '../navigation/route-names';
import MoreHeader from './more-header.react';
import HeaderBackButton from '../navigation/header-back-button.react';

const More = createStackNavigator(
  {
    [MoreScreenRouteName]: MoreScreen,
    [EditEmailRouteName]: EditEmail,
    [EditPasswordRouteName]: EditPassword,
    [DeleteAccountRouteName]: DeleteAccount,
    [BuildInfoRouteName]: BuildInfo,
    [DevToolsRouteName]: DevTools,
    [AppearancePreferencesRouteName]: AppearancePreferences,
  },
  {
    defaultNavigationOptions: ({ navigation }) => ({
      header: MoreHeader,
      headerLeft: navigation.isFirstRouteInParent()
        ? undefined
        : HeaderBackButton,
    }),
  },
);
More.navigationOptions = {
  tabBarLabel: 'More',
  // eslint-disable-next-line react/display-name
  tabBarIcon: ({ tintColor }) => (
    <Icon name="bars" style={[styles.icon, { color: tintColor }]} />
  ),
};

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
});

export default More;
