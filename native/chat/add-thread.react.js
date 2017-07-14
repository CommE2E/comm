// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation';

import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>;

class AddThread extends React.PureComponent {

  props: {
    navigation: NavProp,
  };
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          parentThreadID: PropTypes.string,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  };
  static navigationOptions = {
    title: 'New thread',
  };

  render() {
    return (
      <View style={styles.container}>
        <Text>{this.props.navigation.state.params.parentThreadID}</Text>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const AddThreadRouteName = 'AddThread';

export {
  AddThread,
  AddThreadRouteName,
};
