// @flow

import React from 'react';
import { StyleSheet, View, Text, ScrollView, Platform } from 'react-native';
import ExitApp from 'react-native-exit-app';
import Icon from 'react-native-vector-icons/Ionicons';

import { registerConfig, getConfig } from 'lib/utils/config';

import Button from '../components/button.react';
import { getPersistor } from '../persist';

type Props = {|
|};
class DevTools extends React.PureComponent<Props> {

  static navigationOptions = {
    headerTitle: "Developer tools",
  };

  render() {
    const iconName = "md-checkmark";
    const serverOptions = [
      "https://squadcal.org",
      "http://192.168.1.4/squadcal",
    ];
    if (Platform.OS === "android") {
      serverOptions.push("http://10.0.2.2/squadcal");
    } else {
      serverOptions.push("http://localhost/squadcal");
    }
    const currentPrefix = getConfig().urlPrefix;
    const serverButtons = serverOptions.map(server => {
      let icon = null;
      if (server === currentPrefix) {
        icon = (
          <Icon
            name={iconName}
            size={20}
            color="#036AFF"
            style={styles.icon}
          />
        );
      }
      return (
        <Button
          onPress={() => this.onSelectServer(server)}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor="#EEEEEEDD"
          key={server}
        >
          <Text style={styles.text}>{server}</Text>
          {icon}
        </Button>
      );
    });
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.slightlyPaddedSection}>
          <Button
            onPress={this.onPressCrash}
            style={styles.row}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.redText}>Trigger a crash</Text>
          </Button>
          <View style={styles.hr} />
          <Button
            onPress={this.onPressKill}
            style={styles.row}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.redText}>Kill the app</Text>
          </Button>
          <View style={styles.hr} />
          <Button
            onPress={this.onPressWipe}
            style={styles.row}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.redText}>Wipe state and kill app</Text>
          </Button>
        </View>
        <Text style={styles.header}>SERVER</Text>
        <View style={styles.slightlyPaddedSection}>
          {serverButtons}
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

  onSelectServer = (server: string) => {
    registerConfig({ urlPrefix: server });
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  text: {
    fontSize: 16,
    flex: 1,
  },
  icon: {
    lineHeight: 18,
  },
});

const DevToolsRouteName = 'DevTools';

export {
  DevTools,
  DevToolsRouteName,
};
