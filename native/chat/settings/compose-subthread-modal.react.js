// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  visibilityRules,
} from 'lib/types/thread-types';
import type { NavigationParams } from 'react-navigation';
import type { AppState } from '../../redux-setup';

import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

import { threadTypeDescriptions } from 'lib/shared/thread-utils';
import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { ComposeThreadRouteName } from '../compose-thread.react';
import KeyboardAvoidingView
  from '../../components/keyboard-avoiding-view.react';
import { ThreadSettingsRouteName } from './thread-settings.react';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../../utils/navigation-utils';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: (
    routeName: string,
    params?: NavigationParams
  ) => bool,
  closeModal: () => void,
  // Redux state
  threadSettingsActive: bool,
|};
class ComposeSubthreadModal extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    closeModal: PropTypes.func.isRequired,
    threadSettingsActive: PropTypes.bool.isRequired,
  };
  waitingToNavigate = false;

  render() {
    const content = (
      <View style={styles.modal}>
        <Text style={styles.visibility}>Thread type</Text>
        <Button style={styles.option} onPress={this.onPressOpen}>
          <Icon name="public" size={32} color="black" />
          <Text style={styles.optionText}>Open</Text>
          <Text style={styles.optionExplanation}>
            {threadTypeDescriptions[visibilityRules.CHAT_NESTED_OPEN]}
          </Text>
          <IonIcon
            name="ios-arrow-forward"
            size={20}
            color="#036AFF"
            style={styles.forwardIcon}
          />
        </Button>
        <Button style={styles.option} onPress={this.onPressSecret}>
          <Icon name="lock-outline" size={32} color="black" />
          <Text style={styles.optionText}>Secret</Text>
          <Text style={styles.optionExplanation}>
            {threadTypeDescriptions[visibilityRules.CHAT_SECRET]}
          </Text>
          <IonIcon
            name="ios-arrow-forward"
            size={20}
            color="#036AFF"
            style={styles.forwardIcon}
          />
        </Button>
      </View>
    );
    return (
      <KeyboardAvoidingView style={styles.container}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  onPressOpen = () => {
    if (!this.props.threadSettingsActive || this.waitingToNavigate) {
      return;
    }
    this.waitingToNavigate = true;
    InteractionManager.runAfterInteractions(() => {
      this.props.navigate(
        ComposeThreadRouteName,
        {
          parentThreadID: this.props.threadInfo.id,
          visibilityRules: visibilityRules.CHAT_NESTED_OPEN,
        },
      );
      this.waitingToNavigate = false;
    });
    this.props.closeModal();
  }

  onPressSecret = () => {
    if (!this.props.threadSettingsActive || this.waitingToNavigate) {
      return;
    }
    this.waitingToNavigate = true;
    InteractionManager.runAfterInteractions(() => {
      this.props.navigate(
        ComposeThreadRouteName,
        {
          parentThreadID: this.props.threadInfo.id,
          visibilityRules: visibilityRules.CHAT_SECRET,
        },
      );
      this.waitingToNavigate = false;
    });
    this.props.closeModal();
  }

}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 10,
  },
  modal: {
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#EEEEEE',
  },
  visibility: {
    fontSize: 24,
    textAlign: 'center',
    color: "black",
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  optionText: {
    fontSize: 20,
    paddingLeft: 5,
    color: "black",
  },
  optionExplanation: {
    flex: 1,
    fontSize: 14,
    paddingLeft: 10,
    textAlign: 'center',
    color: "black",
  },
  forwardIcon: {
    paddingLeft: 10,
  },
});

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const appRoute =
      assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
    const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
    const currentChatSubroute = chatRoute.routes[chatRoute.index];
    return {
      threadSettingsActive:
        currentChatSubroute.routeName === ThreadSettingsRouteName &&
        getThreadIDFromParams(currentChatSubroute) === ownProps.threadInfo.id,
    };
  },
)(ComposeSubthreadModal);
