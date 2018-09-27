// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadTypes,
} from 'lib/types/thread-types';
import type {
  NavigationParams,
  NavigationNavigateAction,
} from 'react-navigation';

import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

import { threadTypeDescriptions } from 'lib/shared/thread-utils';

import Button from '../../components/button.react';
import { ComposeThreadRouteName } from '../../navigation/route-names';
import KeyboardAvoidingView
  from '../../components/keyboard-avoiding-view.react';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: ({
    routeName: string,
    params?: NavigationParams,
    action?: NavigationNavigateAction,
    key?: string,
  }) => bool,
  closeModal: () => void,
|};
class ComposeSubthreadModal extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    closeModal: PropTypes.func.isRequired,
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
            {threadTypeDescriptions[threadTypes.CHAT_NESTED_OPEN]}
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
            {threadTypeDescriptions[threadTypes.CHAT_SECRET]}
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
    if (this.waitingToNavigate) {
      return;
    }
    this.waitingToNavigate = true;
    InteractionManager.runAfterInteractions(() => {
      this.props.navigate({
        routeName: ComposeThreadRouteName,
        params: {
          threadType: threadTypes.CHAT_NESTED_OPEN,
          parentThreadID: this.props.threadInfo.id,
        },
        key: ComposeThreadRouteName +
          `${this.props.threadInfo.id}|${threadTypes.CHAT_NESTED_OPEN}`,
      });
      this.waitingToNavigate = false;
    });
    this.props.closeModal();
  }

  onPressSecret = () => {
    if (this.waitingToNavigate) {
      return;
    }
    this.waitingToNavigate = true;
    InteractionManager.runAfterInteractions(() => {
      this.props.navigate({
        routeName: ComposeThreadRouteName,
        params: {
          threadType: threadTypes.CHAT_SECRET,
          parentThreadID: this.props.threadInfo.id,
        },
        key: ComposeThreadRouteName +
          `${this.props.threadInfo.id}|${threadTypes.CHAT_NESTED_OPEN}`,
      });
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

export default ComposeSubthreadModal;
