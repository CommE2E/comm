// @flow

import React from 'react';
import { View, Text, Platform, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import _shuffle from 'lodash/fp/shuffle';
import ExitApp from 'react-native-exit-app';

import Button from './components/button.react';
import { persistor } from './redux-setup';

export type ErrorInfo = { componentStack: string };
export type ErrorData = {| error: Error, info: ErrorInfo |};

const errorTitles = [
  "Oh no!!",
  "Womp womp womp...",
];

type Props = {|
  errorData: ErrorData,
|};
class Crash extends React.PureComponent<Props> {

  errorTitle = _shuffle(errorTitles)[0];

  render() {
    return (
      <View style={styles.container}>
        <Icon name="bug" size={32} color="red" />
        <Text style={styles.header}>{this.errorTitle}</Text>
        <Text style={styles.text}>I'm sorry, but the app crashed.</Text>
        <Text style={styles.text}>
          Here's some text that's probably not helpful:
        </Text>
        <ScrollView style={styles.scrollView}>
          <Text style={styles.errorText}>
            {this.props.errorData.error.message}
          </Text>
        </ScrollView>
        <View style={styles.buttons}>
          <Button onPress={this.onPressKill} style={styles.button}>
            <Text style={styles.buttonText}>Kill the app</Text>
          </Button>
          <Button onPress={this.onPressWipe} style={styles.button}>
            <Text style={styles.buttonText}>Wipe state and kill app</Text>
          </Button>
        </View>
      </View>
    );
  }

  onPressKill = () => {
    ExitApp.exitApp();
  }

  onPressWipe = () => {
    persistor.purge();
    ExitApp.exitApp();
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    paddingBottom: 24,
  },
  text: {
    paddingBottom: 24,
  },
  errorText: {
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "Roboto",
      default: "monospace",
    }),
  },
  scrollView: {
    flex: 1,
    maxHeight: 200,
    paddingHorizontal: 50,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
  },
  button: {
    backgroundColor: "#FF0000",
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginHorizontal: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
  },
});

export default Crash;
