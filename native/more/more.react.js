// @flow

import type { NavigationScreenProp } from 'react-navigation';

import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

class More extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
  };
  state: {};

  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
    }).isRequired,
  };

  static navigationOptions = {
    tabBar: {
      label: 'More',
      icon: ({ tintColor }) => (
        <Icon
          name="bars"
          style={[styles.icon, { color: tintColor }]}
        />
      ),
    },
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>
          Press Cmd+R to reload,{'\n'}
          Cmd+D or shake for dev menu
        </Text>
        <Button
          onPress={this.onPress}
          title="Log out"
        />
      </View>
    );
  }

  onPress = () => {
    this.props.navigation.navigate('LoggedOutModal');
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
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

export default More;
