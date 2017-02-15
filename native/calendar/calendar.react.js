// @flow

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import * as TypeaheadText from 'lib/shared/typeahead-text.js';

type Props = {
};
type State = {
};

class Calendar extends React.PureComponent {

  props: Props;
  state: State;

  static navigationOptions = {
    tabBar: {
      label: 'Calendar',
      icon: ({ tintColor }) => (
        <Icon
          name="calendar"
          style={[styles.icon, { color: tintColor }]}
        />
      ),
    },
  };

  constructor(props: Props) {
    super(props);
    this.state = {
    };
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          {`Welcome to ${TypeaheadText.homeText}`}
        </Text>
        <Text style={styles.instructions}>
          To get started, edit index.ios.js
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
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

export default Calendar;
