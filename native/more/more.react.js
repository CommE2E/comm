// @flow

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { createStackNavigator } from 'react-navigation';

import MoreScreen from './more-screen.react';
import EditEmail from './edit-email.react';
import EditPassword from './edit-password.react';
import DeleteAccount from './delete-account.react';
import BuildInfo from './build-info.react';
import DevTools from './dev-tools.react';
import {
  MoreScreenRouteName,
  EditEmailRouteName,
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
} from '../navigation/route-names';
import Header from '../navigation/header.react';

const More = createStackNavigator(
  {
    [MoreScreenRouteName]: MoreScreen,
    [EditEmailRouteName]: EditEmail,
    [EditPasswordRouteName]: EditPassword,
    [DeleteAccountRouteName]: DeleteAccount,
    [BuildInfoRouteName]: BuildInfo,
    [DevToolsRouteName]: DevTools,
  },
  {
    defaultNavigationOptions: {
      header: Header,
    },
    cardStyle: {
      backgroundColor: "#E9E9EF",
    },
  },
);
More.navigationOptions = ({ navigation }) => ({
  tabBarLabel: 'More',
  tabBarIcon: ({ tintColor }) => (
    <Icon
      name="bars"
      style={[styles.icon, { color: tintColor }]}
    />
  ),
});

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
});

export default More;
