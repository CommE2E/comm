// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { NavigationParams } from 'react-navigation';

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Text,
  InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

import { visibilityRules } from 'lib/types/thread-types';

import { iosKeyboardOffset } from '../../dimensions';
import Button from '../../components/button.react';
import { ComposeThreadRouteName } from '../compose-thread.react';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: (
    routeName: string,
    params?: NavigationParams
  ) => bool,
  closeModal: () => void,
|};
class ComposeSubthreadModal extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    closeModal: PropTypes.func.isRequired,
  };

  render() {
    const content = (
      <View style={styles.modal}>
        <Text style={styles.visibility}>Visibility</Text>
        <Button style={styles.option} onPress={this.onPressOpen}>
          <Icon name="public" size={32} color="black" />
          <Text style={styles.optionText}>Open</Text>
          <Text style={styles.optionExplanation}>
            Anybody in the parent thread can see an open child thread.
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
            Only visible to its members and admins of ancestor threads.
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
    if (Platform.OS === "ios") {
      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={iosKeyboardOffset}
        >{content}</KeyboardAvoidingView>
      );
    } else {
      return <View style={styles.container}>{content}</View>;
    }
  }

  onPressOpen = () => {
    InteractionManager.runAfterInteractions(() => {
      this.props.navigate(
        ComposeThreadRouteName,
        {
          parentThreadID: this.props.threadInfo.id,
          visibilityRules: visibilityRules.CHAT_NESTED_OPEN,
        },
      );
    });
    this.props.closeModal();
  }

  onPressSecret = () => {
    InteractionManager.runAfterInteractions(() => {
      this.props.navigate(
        ComposeThreadRouteName,
        {
          parentThreadID: this.props.threadInfo.id,
          visibilityRules: visibilityRules.CHAT_SECRET,
        },
      );
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
