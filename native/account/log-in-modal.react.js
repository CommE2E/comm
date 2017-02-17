// @flow

import type { NavigationScreenProp } from 'react-navigation';

import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';

class LogInModal extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
  };
  state: {};

  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
    }).isRequired,
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>
          log in please??
        </Text>
        <Button
          onPress={this.onPress}
          title="Log in"
        />
      </View>
    );
  }

  onPress = () => {
    this.props.navigation.goBack();
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

export default LogInModal;
