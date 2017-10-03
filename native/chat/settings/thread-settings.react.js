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
import { childThreadInfos } from 'lib/selectors/thread-selectors';

import ThreadSettingsCategory from './thread-settings-category.react';
import ColorSplotch from '../../components/color-splotch.react';
import EditSettingButton from './edit-setting-button.react';
import Button from '../../components/button.react';
import { MessageListRouteName } from '../message-list.react';
import ThreadSettingsUser from './thread-settings-user.react';
import ThreadSettingsListAction from './thread-settings-list-action.react';
import AddUsersModal from './add-users-modal.react';
import ThreadSettingsChildThread from './thread-settings-child-thread.react';
import { AddThreadRouteName } from '../add-thread.react';
import { registerChatScreen } from '../chat-screen-registry';

const itemPageLength = 5;

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>
  & { state: { params: { threadInfo: ThreadInfo } } };

type Props = {|
  navigation: NavProp,
  // Redux state
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
  threadMembers: RelativeUserInfo[],
  childThreadInfos: ?ThreadInfo[],
|};
type State = {|
  showAddUsersModal: bool,
  showMaxMembers: number,
  showMaxChildThreads: number,
|};
class InnerThreadSettings extends React.PureComponent {

  props: Props;
  state: State = {
    showAddUsersModal: false,
    showMaxMembers: itemPageLength,
    showMaxChildThreads: itemPageLength,
  };
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
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
    childThreadInfos: PropTypes.arrayOf(threadInfoPropType),
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
  });

  componentDidMount() {
    registerChatScreen(this.props.navigation.state.key, this);
  }

  componentWillUnmount() {
    registerChatScreen(this.props.navigation.state.key, null);
  }

  canReset = () => false;

  render() {
    let parent;
    if (this.props.parentThreadInfo) {
      parent = (
        <Button
          onPress={this.onPressParentThread}
          style={[styles.currentValue, styles.padding]}
        >
          <Text
            style={[styles.currentValueText, styles.parentThreadLink]}
            numberOfLines={1}
          >
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

    let threadMembers;
    let seeMoreMembers = null;
    if (this.props.threadMembers.length > this.state.showMaxMembers) {
      threadMembers =
        this.props.threadMembers.slice(0, this.state.showMaxMembers);
      seeMoreMembers = (
        <View style={styles.seeMoreRow} key="seeMore">
          <ThreadSettingsListAction
            onPress={this.onPressSeeMoreMembers}
            text="See more..."
            iconName="ios-more"
            iconColor="#036AFF"
            iconSize={36}
            iconStyle={styles.seeMoreIcon}
          />
        </View>
      );
    } else {
      threadMembers = this.props.threadMembers;
    }
    const members = threadMembers.map(userInfo => {
      if (!userInfo.username) {
        return null;
      }
      const userInfoWithUsername = {
        id: userInfo.id,
        username: userInfo.username,
        isViewer: userInfo.isViewer,
      };
      return (
        <View style={styles.itemRow} key={userInfo.id}>
          <ThreadSettingsUser
            userInfo={userInfoWithUsername}
            threadInfo={this.props.threadInfo}
          />
        </View>
      );
    }).filter(x => x);
    if (seeMoreMembers) {
      members.push(seeMoreMembers);
    }

    let childThreads = null;
    if (this.props.childThreadInfos) {
      let childThreadInfos;
      let seeMoreChildThreads = null;
      if (this.props.childThreadInfos.length > this.state.showMaxChildThreads) {
        childThreadInfos =
          this.props.childThreadInfos.slice(0, this.state.showMaxChildThreads);
        seeMoreChildThreads = (
          <View style={styles.seeMoreRow} key="seeMore">
            <ThreadSettingsListAction
              onPress={this.onPressSeeMoreChildThreads}
              text="See more..."
              iconName="ios-more"
              iconColor="#036AFF"
              iconSize={32}
              iconStyle={styles.seeMoreIcon}
              key="seeMore"
            />
          </View>
        );
      } else {
        childThreadInfos = this.props.childThreadInfos;
      }
      childThreads = childThreadInfos.map(threadInfo => {
        return (
          <View style={styles.itemRow} key={threadInfo.id}>
            <ThreadSettingsChildThread
              threadInfo={threadInfo}
              navigate={this.props.navigation.navigate}
            />
          </View>
        );
      });
      if (seeMoreChildThreads) {
        childThreads.push(seeMoreChildThreads);
      }
    }

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
          <ThreadSettingsCategory type="unpadded" title="Child threads">
            <View style={styles.itemList}>
              <View style={styles.addItemRow}>
                <ThreadSettingsListAction
                  onPress={this.onPressAddChildThread}
                  text="Add child thread"
                  iconName="md-add"
                  iconColor="#009900"
                  iconSize={20}
                />
              </View>
              {childThreads}
            </View>
          </ThreadSettingsCategory>
          <ThreadSettingsCategory type="unpadded" title="Members">
            <View style={styles.itemList}>
              <View style={styles.addItemRow}>
                <ThreadSettingsListAction
                  onPress={this.onPressAddUser}
                  text="Add users"
                  iconName="md-add"
                  iconColor="#009900"
                  iconSize={20}
                />
              </View>
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

  onPressAddChildThread = () => {
    this.props.navigation.navigate(
      AddThreadRouteName,
      { parentThreadID: this.props.threadInfo.id },
    );
  }

  closeAddUsersModal = () => {
    this.setState({ showAddUsersModal: false });
  }

  onPressSeeMoreMembers = () => {
    this.setState(prevState => ({
      showMaxMembers: prevState.showMaxMembers + itemPageLength,
    }));
  }

  onPressSeeMoreChildThreads = () => {
    this.setState(prevState => ({
      showMaxChildThreads: prevState.showMaxChildThreads + itemPageLength,
    }));
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
  itemRow: {
    flex: 1,
    flexDirection: 'row',
    marginHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
  },
  seeMoreRow: {
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
    marginHorizontal: 12,
    paddingTop: 2,
  },
  addItemRow: {
    marginHorizontal: 12,
    marginTop: 4,
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
  itemList: {
    paddingBottom: 4,
  },
  seeMoreIcon: {
    position: 'absolute',
    right: 10,
    top: 15,
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
      childThreadInfos: childThreadInfos(state)[threadInfo.id],
    };
  },
)(InnerThreadSettings);

export {
  ThreadSettings,
  ThreadSettingsRouteName,
};
