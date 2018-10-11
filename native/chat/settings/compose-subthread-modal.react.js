// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  threadTypes,
} from 'lib/types/thread-types';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';

import * as React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

import { threadTypeDescriptions } from 'lib/shared/thread-utils';

import Button from '../../components/button.react';
import {
  ComposeSubthreadModalRouteName,
  ComposeThreadRouteName,
} from '../../navigation/route-names';
import { createModal } from '../../components/modal.react';

const Modal = createModal(ComposeSubthreadModalRouteName);
type NavProp = NavigationScreenProp<{|
  ...NavigationLeafRoute,
  params: {|
    threadInfo: ThreadInfo,
  |},
|}>;

type Props = {|
  navigation: NavProp,
|};
class ComposeSubthreadModal extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
    }).isRequired,
  };

  render() {
    return (
      <Modal
        navigation={this.props.navigation}
        modalStyle={styles.modal}
      >
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
      </Modal>
    );
  }

  onPressOpen = () => {
    const threadID = this.props.navigation.state.params.threadInfo.id;
    this.props.navigation.navigate({
      routeName: ComposeThreadRouteName,
      params: {
        threadType: threadTypes.CHAT_NESTED_OPEN,
        parentThreadID: threadID,
      },
      key:
        `${ComposeThreadRouteName}|${threadID}|${threadTypes.CHAT_NESTED_OPEN}`,
    });
  }

  onPressSecret = () => {
    const threadID = this.props.navigation.state.params.threadInfo.id;
    this.props.navigation.navigate({
      routeName: ComposeThreadRouteName,
      params: {
        threadType: threadTypes.CHAT_SECRET,
        parentThreadID: threadID,
      },
      key: `${ComposeThreadRouteName}|${threadID}|${threadTypes.CHAT_SECRET}`,
    });
  }

}

const styles = StyleSheet.create({
  modal: {
    flex: 0,
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
