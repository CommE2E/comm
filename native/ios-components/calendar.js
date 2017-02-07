// @flow

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

import * as TypeaheadText from 'lib/shared/typeahead-text.js';

class Calendar extends React.Component {

  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedTab: 'calendar',
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
