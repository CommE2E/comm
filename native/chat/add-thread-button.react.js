// @flow

import type { NavigationParams } from 'react-navigation/src/TypeDefinition';

import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { AddThreadRouteName } from './add-thread.react';
import Button from '../components/button.react';

class AddThreadButton extends React.PureComponent {

  props: {
    parentThreadID?: string,
    navigate: (
      routeName: string,
      params?: NavigationParams,
    ) => bool,
  };
  static propTypes = {
    parentThreadID: PropTypes.string,
    navigate: PropTypes.func.isRequired,
  };

  render() {
    let icon;
    if (Platform.OS === "ios") {
      icon = (
        <Icon
          name="ios-add"
          size={36}
          style={styles.addButton}
          color="#036AFF"
        />
      );
    } else {
      icon = (
        <Icon
          name="md-add"
          size={36}
          style={styles.addButton}
          color="#0077CC"
        />
      );
    }
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        {icon}
      </Button>
    );
  }

  onPress = () => {
    this.props.navigate(
      AddThreadRouteName,
      { parentThreadID: this.props.parentThreadID },
    );
  }

}

const styles = StyleSheet.create({
  addButton: {
    paddingHorizontal: 10,
  },
});

export default AddThreadButton;
