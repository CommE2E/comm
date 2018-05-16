// @flow

import type { NavigationParams } from 'react-navigation';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Ionicons';
import { HeaderTitle } from 'react-navigation';

import Button from '../components/button.react';
import { ThreadSettingsRouteName } from './settings/thread-settings.react';

type Props = {
  threadInfo: ThreadInfo,
  navigate: ({
    routeName: string,
    params?: NavigationParams,
    key?: string,
  }) => bool,
};
class MessageListHeaderTitle extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
  };

  render() {
    let icon, fakeIcon;
    if (Platform.OS === "ios") {
      icon = (
        <Icon
          name="ios-arrow-forward"
          size={20}
          style={styles.forwardIcon}
          color="#036AFF"
        />
      );
      fakeIcon = (
        <Icon
          name="ios-arrow-forward"
          size={20}
          style={styles.fakeIcon}
        />
      );
    }
    return (
      <Button
        onPress={this.onPress}
        style={styles.button}
        topStyle={styles.button}
        androidBorderlessRipple={true}
      >
        <View style={styles.container}>
          {fakeIcon}
          <HeaderTitle>
            {this.props.threadInfo.uiName}
          </HeaderTitle>
          {icon}
        </View>
      </Button>
    );
  }

  onPress = () => {
    const threadInfo = this.props.threadInfo;
    this.props.navigate({
      routeName: ThreadSettingsRouteName,
      params: { threadInfo },
      key: `${ThreadSettingsRouteName}${threadInfo.id}`,
    });
  }

}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: Platform.OS === "android" ? "flex-start" : "center",
  },
  forwardIcon: {
    flex: 1,
    minWidth: 25,
  },
  fakeIcon: {
    flex: 1,
    minWidth: 25,
    opacity: 0,
  },
});

export default MessageListHeaderTitle;
