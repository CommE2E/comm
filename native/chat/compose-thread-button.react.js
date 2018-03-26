// @flow

import type { NavigationParams } from 'react-navigation';
import type { AppState } from '../redux-setup';

import React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { ComposeThreadRouteName } from './compose-thread.react';
import Button from '../components/button.react';
import { assertNavigationRouteNotLeafNode } from '../utils/navigation-utils';
import { ChatThreadListRouteName } from './chat-thread-list.react';

type Props = {
  navigate: (
    routeName: string,
    params?: NavigationParams,
  ) => bool,
  // Redux state
  chatThreadListActive: bool,
};
class ComposeThreadButton extends React.PureComponent<Props> {

  static propTypes = {
    navigate: PropTypes.func.isRequired,
    chatThreadListActive: PropTypes.bool.isRequired,
  };

  render() {
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        <Icon
          name="ios-create-outline"
          size={30}
          style={styles.composeButton}
          color="#036AFF"
        />
      </Button>
    );
  }

  onPress = () => {
    if (this.props.chatThreadListActive) {
      this.props.navigate(ComposeThreadRouteName, {});
    }
  }

}

const styles = StyleSheet.create({
  composeButton: {
    paddingHorizontal: 10,
  },
});

export default connect((state: AppState) => {
  const appRoute =
    assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
  const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
  const currentChatSubroute = chatRoute.routes[chatRoute.index];
  return {
    chatThreadListActive:
      currentChatSubroute.routeName === ChatThreadListRouteName,
  };
})(ComposeThreadButton);
