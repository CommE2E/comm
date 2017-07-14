// @flow

import React from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

class AddThreadButton extends React.PureComponent {

  props: {
    parentThreadID?: string,
  };
  static propTypes = {
    parentThreadID: PropTypes.string,
  };

  render() {
    let icon;
    if (Platform.OS === "ios") {
      icon = (
        <Icon
          name="ios-add"
          size={36}
          style={styles.addButton}
          color="#0077CC"
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
      <TouchableOpacity
        onPress={this.onPress}
        activeOpacity={0.4}
      >
        {icon}
      </TouchableOpacity>
    );
  }

  onPress = () => {
  }

}

const styles = StyleSheet.create({
  addButton: {
    paddingRight: 10,
  },
});

export default AddThreadButton;
