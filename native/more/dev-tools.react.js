// @flow

import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import ExitApp from 'react-native-exit-app';

import Button from '../components/button.react';
import { getPersistor } from '../persist';

type Props = {|
|};
class DevTools extends React.PureComponent<Props> {

  static navigationOptions = {
    headerTitle: "Developer tools",
  };

  render() {
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.slightlyPaddedSection}>
          <Button
            onPress={this.onPressCrash}
            style={styles.redButton}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.redText}>Trigger a crash</Text>
          </Button>
          <View style={styles.hr} />
          <Button
            onPress={this.onPressKill}
            style={styles.redButton}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.redText}>Kill the app</Text>
          </Button>
          <View style={styles.hr} />
          <Button
            onPress={this.onPressWipe}
            style={styles.redButton}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.redText}>Wipe state and kill app</Text>
          </Button>
        </View>
      </ScrollView>
    );
  }

  onPressCrash = () => {
    throw new Error("User triggered crash through dev menu!");
  }

  onPressKill = () => {
    ExitApp.exitApp();
  }

  onPressWipe = () => {
    getPersistor().purge();
    ExitApp.exitApp();
  }

}

const styles = StyleSheet.create({
  scrollView: {
    paddingTop: 24,
  },
  slightlyPaddedSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    marginBottom: 24,
    paddingVertical: 2,
  },
  redButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  redText: {
    fontSize: 16,
    color: "#AA0000",
    flex: 1,
  },
  hr: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 15,
  },
});

const DevToolsRouteName = 'DevTools';

export {
  DevTools,
  DevToolsRouteName,
};
