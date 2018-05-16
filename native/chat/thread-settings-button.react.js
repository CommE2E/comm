// @flow

import type { NavigationParams } from 'react-navigation';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { ThreadSettingsRouteName } from './settings/thread-settings.react';
import Button from '../components/button.react';

type Props = {
  threadInfo: ThreadInfo,
  navigate: ({
    routeName: string,
    params?: NavigationParams,
    key?: string,
  }) => bool,
};
class ThreadSettingsButton extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        <Icon
          name="md-settings"
          size={30}
          style={styles.button}
          color="#3366AA"
        />
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
    paddingHorizontal: 10,
  },
});

export default ThreadSettingsButton;
