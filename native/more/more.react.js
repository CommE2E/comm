// @flow

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { StackNavigator } from 'react-navigation';

import {
  MoreScreen,
  MoreScreenRouteName,
} from './more-screen.react';

const More = StackNavigator(
  {
    [MoreScreenRouteName]: { screen: MoreScreen },
  },
  {
    navigationOptions: ({ navigation }) => ({
      tabBarLabel: 'More',
      tabBarIcon: ({ tintColor }) => (
        <Icon
          name="bars"
          style={[styles.icon, { color: tintColor }]}
        />
      ),
    }),
    headerMode: "none",
  },
);

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
});

const MoreRouteName = 'More';
export {
  More,
  MoreRouteName,
};
