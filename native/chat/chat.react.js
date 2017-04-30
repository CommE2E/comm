// @flow

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

type Props = {
};
type State = {
};

class Chat extends React.PureComponent {

  props: Props;
  state: State;

  static navigationOptions = {
    tabBarLabel: 'Chat',
    tabBarIcon: ({ tintColor }) => (
      <Icon
        name="comments-o"
        style={[styles.icon, { color: tintColor }]}
      />
    ),
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>
          Stay down
        </Text>
      </View>
    );
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

export default Chat;
