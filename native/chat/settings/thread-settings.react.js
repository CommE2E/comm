// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation/src/TypeDefinition';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { RelativeUserInfo } from 'lib/types/user-types';
import { relativeUserInfoPropType } from 'lib/types/user-types';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modal';

import { visibilityRules } from 'lib/types/thread-types';
import {
  relativeUserInfoSelectorForMembersOfThread,
} from 'lib/selectors/user-selectors';

import ThreadSettingsCategory from './thread-settings-category.react';
import ColorSplotch from '../../components/color-splotch.react';
import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';
import { MessageListRouteName } from '../message-list.react';
import {
  ThreadSettingsUser,
  ThreadSettingsAddUser,
} from './thread-settings-members.react';
import AddUsersModal from './add-users-modal.react';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>
  & { state: { params: { threadInfo: ThreadInfo } } };

type Props = {|
  navigation: NavProp,
  // Redux state
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
  threadMembers: RelativeUserInfo[],
|};
type State = {|
  showAddUsersModal: bool,
|};
class InnerThreadSettings extends React.PureComponent {

  props: Props;
  state: State = {
    showAddUsersModal: false,
  };
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
      goBack: PropTypes.func.isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType.isRequired,
    parentThreadInfo: threadInfoPropType,
    threadMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
  });

  render() {
    let parent;
    if (this.props.parentThreadInfo) {
      parent = (
        <Button
          onPress={this.onPressParentThread}
          style={[styles.currentValue, styles.padding]}
        >
          <Text style={[styles.currentValueText, styles.parentThreadLink]}>
            {this.props.parentThreadInfo.name}
          </Text>
        </Button>
      );
    } else {
      parent = (
        <Text style={[
          styles.currentValue,
          styles.currentValueText,
          styles.padding,
          styles.noParent,
        ]}>
          No parent
        </Text>
      );
    }
    const visRules = this.props.threadInfo.visibilityRules;
    const visibility =
      visRules === visibilityRules.OPEN ||
      visRules === visibilityRules.CHAT_NESTED_OPEN
        ? "Public"
        : "Secret";
    const members = this.props.threadMembers.map((userInfo) => {
      if (!userInfo.username) {
        return null;
      }
      const userInfoWithUsername = {
        id: userInfo.id,
        username: userInfo.username,
        isViewer: userInfo.isViewer,
      };
      return (
        <View style={styles.userRow} key={userInfo.id}>
          <ThreadSettingsUser
            userInfo={userInfoWithUsername}
            threadInfo={this.props.threadInfo}
          />
        </View>
      );
    }).filter(x => x);
    return (
      <View>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <ThreadSettingsCategory type="full" title="Basics">
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={[styles.currentValue, styles.currentValueText]}>
                {this.props.threadInfo.name}
              </Text>
              <EditSettingButton
                onPress={this.onPressEditName}
                canChangeSettings={this.props.threadInfo.canChangeSettings}
              />
            </View>
            <View style={styles.colorRow}>
              <Text style={[styles.label, styles.colorLine]}>Color</Text>
              <View style={styles.currentValue}>
                <ColorSplotch color={this.props.threadInfo.color} />
              </View>
              <EditSettingButton
                onPress={this.onPressEditColor}
                canChangeSettings={this.props.threadInfo.canChangeSettings}
                style={styles.colorLine}
              />
            </View>
          </ThreadSettingsCategory>
          <ThreadSettingsCategory type="full" title="Privacy">
            <View style={styles.noPaddingRow}>
              <Text style={[styles.label, styles.padding]}>Parent</Text>
              {parent}
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Visibility</Text>
              <Text style={[styles.currentValue, styles.currentValueText]}>
                {visibility}
              </Text>
            </View>
          </ThreadSettingsCategory>
          <ThreadSettingsCategory type="unpadded" title="Members">
            <View style={styles.members}>
              <ThreadSettingsAddUser onPress={this.onPressAddUser} />
              {members}
            </View>
          </ThreadSettingsCategory>
        </ScrollView>
        <Modal
          isVisible={this.state.showAddUsersModal}
          onBackButtonPress={this.closeAddUsersModal}
          onBackdropPress={this.closeAddUsersModal}
        >
          <AddUsersModal
            threadInfo={this.props.threadInfo}
            close={this.closeAddUsersModal}
          />
        </Modal>
      </View>
    );
  }

  onPressEditName = () => {
  }

  onPressEditColor = () => {
  }

  onPressParentThread = () => {
    this.props.navigation.navigate(
      MessageListRouteName,
      { threadInfo: this.props.parentThreadInfo },
    );
  }

  onPressAddUser = () => {
    this.setState({ showAddUsersModal: true });
  }

  closeAddUsersModal = () => {
    this.setState({ showAddUsersModal: false });
  }

}

const styles = StyleSheet.create({
  scrollView: {
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  noPaddingRow: {
    flexDirection: 'row',
  },
  padding: {
    paddingVertical: 4,
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
  },
  colorRow: {
    flexDirection: 'row',
    paddingTop: 4,
    paddingBottom: 8,
  },
  colorLine: {
    lineHeight: 25,
  },
  currentValue: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 4,
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
  },
  currentValueText: {
    fontSize: 16,
    color: "#333333",
  },
  noParent: {
    fontStyle: 'italic',
  },
  parentThreadLink: {
    color: "#036AFF",
  },
  members: {
    paddingBottom: 4,
  },
});

const ThreadSettingsRouteName = 'ThreadSettings';
const ThreadSettings = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    const passedThreadInfo = ownProps.navigation.state.params.threadInfo;
    // We pull the version from Redux so we get updates once they go through
    const threadInfo = state.threadInfos[passedThreadInfo.id];
    return {
      threadInfo,
      parentThreadInfo: threadInfo.parentThreadID
        ? state.threadInfos[threadInfo.parentThreadID]
        : null,
      threadMembers:
        relativeUserInfoSelectorForMembersOfThread(threadInfo.id)(state),
    };
  },
)(InnerThreadSettings);

export {
  ThreadSettings,
  ThreadSettingsRouteName,
};
