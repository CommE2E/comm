// @flow

import type { NavigationParams } from 'react-navigation';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { ThreadSettingsRouteName } from './settings/thread-settings.react';
import Button from '../components/button.react';
import { MessageListRouteName } from './message-list.react';
import { assertNavigationRouteNotLeafNode } from '../utils/navigation-utils';

type Props = {
  threadInfo: ThreadInfo,
  navigate: (
    routeName: string,
    params?: NavigationParams,
  ) => bool,
  // Redux state
  messageListActive: bool,
};
class ThreadSettingsButton extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    messageListActive: PropTypes.bool.isRequired,
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
    if (!this.props.messageListActive) {
      return;
    }
    this.props.navigate(
      ThreadSettingsRouteName,
      { threadInfo: this.props.threadInfo },
    );
  }

}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 10,
  },
});

export default connect((state: AppState) => {
  const appRoute =
    assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
  const currentChatSubroute = chatRoute.routes[chatRoute.index];
  return {
    messageListActive: currentChatSubroute.routeName === MessageListRouteName,
  };
})(ThreadSettingsButton);
