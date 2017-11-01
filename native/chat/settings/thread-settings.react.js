// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
} from 'react-navigation/src/TypeDefinition';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType, threadPermissions } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { RelativeUserInfo } from 'lib/types/user-types';
import { relativeUserInfoPropType } from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChangeThreadSettingsResult } from 'lib/actions/thread-actions';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';

import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';
import Icon from 'react-native-vector-icons/FontAwesome';

import { visibilityRules } from 'lib/types/thread-types';
import {
  relativeUserInfoSelectorForMembersOfThread,
} from 'lib/selectors/user-selectors';
import { childThreadInfos } from 'lib/selectors/thread-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  changeThreadSettingsActionTypes,
  changeSingleThreadSetting,
} from 'lib/actions/thread-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';

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
import SaveSettingButton from './save-setting-button.react';
import ColorPickerModal from '../color-picker-modal.react';

const itemPageLength = 5;

type NavProp = NavigationScreenProp<NavigationRoute>
  & { state: { params: { threadInfo: ThreadInfo } } };

type Props = {|
  navigation: NavProp,
  // Redux state
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
  threadMembers: RelativeUserInfo[],
  childThreadInfos: ?ThreadInfo[],
  nameEditLoadingStatus: LoadingStatus,
  colorEditLoadingStatus: LoadingStatus,
  descriptionEditLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeSingleThreadSetting: (
    threadID: string,
    field: "name" | "description" | "color",
    value: string,
  ) => Promise<ChangeThreadSettingsResult>,
|};
type State = {|
  showAddUsersModal: bool,
  showMaxMembers: number,
  showMaxChildThreads: number,
  nameEditValue: ?string,
  descriptionEditValue: ?string,
  nameTextHeight: ?number,
  descriptionTextHeight: ?number,
  showEditColorModal: bool,
  colorEditValue: string,
|};
class InnerThreadSettings extends React.PureComponent<Props, State> {

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
      setParams: PropTypes.func.isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType.isRequired,
    parentThreadInfo: threadInfoPropType,
    threadMembers: PropTypes.arrayOf(relativeUserInfoPropType).isRequired,
    childThreadInfos: PropTypes.arrayOf(threadInfoPropType),
    nameEditLoadingStatus: loadingStatusPropType.isRequired,
    colorEditLoadingStatus: loadingStatusPropType.isRequired,
    descriptionEditLoadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeSingleThreadSetting: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.threadInfo.name,
    headerBackTitle: "Back",
  });
  nameTextInput: ?TextInput;
  descriptionTextInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      showAddUsersModal: false,
      showMaxMembers: itemPageLength,
      showMaxChildThreads: itemPageLength,
      nameEditValue: null,
      descriptionEditValue: null,
      nameTextHeight: null,
      descriptionTextHeight: null,
      showEditColorModal: false,
      colorEditValue: props.threadInfo.color,
    };
  }

  componentDidMount() {
    registerChatScreen(this.props.navigation.state.key, this);
  }

  componentWillUnmount() {
    registerChatScreen(this.props.navigation.state.key, null);
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      !_isEqual(nextProps.threadInfo)
        (this.props.navigation.state.params.threadInfo)
    ) {
      this.props.navigation.setParams({
        threadInfo: nextProps.threadInfo,
      });
    }
    if (
      nextProps.threadInfo.color !== this.props.threadInfo.color &&
      this.state.colorEditValue === this.props.threadInfo.color
    ) {
      this.setState({ colorEditValue: nextProps.threadInfo.color });
    }
  }

  canReset = () => {
    return !this.state.showAddUsersModal &&
      (this.state.nameEditValue === null ||
        this.state.nameEditValue === undefined) &&
      !this.state.showEditColorModal &&
      this.props.nameEditLoadingStatus !== "loading" &&
      this.props.colorEditLoadingStatus !== "loading" &&
      this.props.descriptionEditLoadingStatus !== "loading";
  }

  render() {
    const canStartEditing = this.canReset();
    const permissions = this.props.threadInfo.currentUserRole.permissions;
    const canEditThread = permissions[threadPermissions.EDIT_THREAD];
    const canChangeSettings = canEditThread && canStartEditing;

    let name;
    if (
      this.state.nameEditValue === null ||
      this.state.nameEditValue === undefined
    ) {
      name = [
        <Text
          style={[styles.currentValue, styles.currentValueText]}
          onLayout={this.onLayoutNameText}
          key="text"
        >
          {this.props.threadInfo.name}
        </Text>,
        <EditSettingButton
          onPress={this.onPressEditName}
          canChangeSettings={canChangeSettings}
          key="editButton"
        />,
      ];
    } else {
      let button;
      if (this.props.nameEditLoadingStatus !== "loading") {
        button = (
          <SaveSettingButton
            onPress={this.submitNameEdit}
            key="saveButton"
          />
        );
      } else {
        button = <ActivityIndicator size="small" key="activityIndicator" />;
      }
      const textInputStyle = {};
      if (
        this.state.nameTextHeight !== undefined &&
        this.state.nameTextHeight !== null
      ) {
        textInputStyle.height = this.state.nameTextHeight;
      }
      name = [
        <TextInput
          style={[styles.currentValue, styles.currentValueText, textInputStyle]}
          underlineColorAndroid="transparent"
          value={this.state.nameEditValue}
          onChangeText={this.onChangeNameText}
          multiline={true}
          autoFocus={true}
          selectTextOnFocus={true}
          onBlur={this.submitNameEdit}
          editable={this.props.nameEditLoadingStatus !== "loading"}
          onContentSizeChange={this.onNameTextInputContentSizeChange}
          ref={this.nameTextInputRef}
          key="textInput"
        />,
        button,
      ];
    }

    let colorButton;
    if (this.props.colorEditLoadingStatus !== "loading") {
      colorButton = (
        <EditSettingButton
          onPress={this.onPressEditColor}
          canChangeSettings={canChangeSettings}
          style={styles.colorLine}
        />
      );
    } else {
      colorButton = <ActivityIndicator size="small" key="activityIndicator" />;
    }

    let descriptionPanel = null;
    if (
      this.state.descriptionEditValue !== null &&
      this.state.descriptionEditValue !== undefined
    ) {
      const button = this.props.descriptionEditLoadingStatus !== "loading"
        ? <SaveSettingButton onPress={this.submitDescriptionEdit} />
        : <ActivityIndicator size="small" />;
      const textInputStyle = {};
      if (
        this.state.descriptionTextHeight !== undefined &&
        this.state.descriptionTextHeight !== null
      ) {
        textInputStyle.height = this.state.descriptionTextHeight;
      }
      descriptionPanel = (
        <ThreadSettingsCategory type="full" title="Description">
          <View style={[styles.noPaddingRow, styles.padding]}>
            <TextInput
              style={[
                styles.descriptionText,
                styles.currentValueText,
                textInputStyle,
              ]}
              underlineColorAndroid="transparent"
              value={this.state.descriptionEditValue}
              onChangeText={this.onChangeDescriptionText}
              multiline={true}
              autoFocus={true}
              selectTextOnFocus={true}
              onBlur={this.submitDescriptionEdit}
              editable={this.props.descriptionEditLoadingStatus !== "loading"}
              onContentSizeChange={this.onDescriptionTextInputContentSizeChange}
              ref={this.descriptionTextInputRef}
            />
            {button}
          </View>
        </ThreadSettingsCategory>
      );
    } else if (this.props.threadInfo.description) {
      descriptionPanel = (
        <ThreadSettingsCategory type="full" title="Description">
          <View style={[styles.noPaddingRow, styles.padding]}>
            <Text
              style={[styles.descriptionText, styles.currentValueText]}
              onLayout={this.onLayoutDescriptionText}
            >
              {this.props.threadInfo.description}
            </Text>
            <EditSettingButton
              onPress={this.onPressEditDescription}
              canChangeSettings={canChangeSettings}
              key="editButton"
            />
          </View>
        </ThreadSettingsCategory>
      );
    } else if (canEditThread) {
      descriptionPanel = (
        <ThreadSettingsCategory type="outline" title="Description">
          <Button
            onPress={this.onPressEditDescription}
            style={styles.addDescriptionButton}
            iosFormat="highlight"
            iosHighlightUnderlayColor="#EEEEEEDD"
          >
            <Text style={styles.addDescriptionText}>
              Add a description...
            </Text>
            <Icon
              name="pencil"
              size={16}
              style={styles.editIcon}
              color="#888888"
            />
          </Button>
        </ThreadSettingsCategory>
      );
    }

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
            canEdit={canStartEditing}
          />
        </View>
      );
    }).filter(x => x);
    if (seeMoreMembers) {
      members.push(seeMoreMembers);
    }

    let addMembers = null;
    if (permissions[threadPermissions.ADD_MEMBERS]) {
      addMembers = (
        <View style={styles.addItemRow}>
          <ThreadSettingsListAction
            onPress={this.onPressAddUser}
            text="Add users"
            iconName="md-add"
            iconColor="#009900"
            iconSize={20}
          />
        </View>
      );
    }

    let membersPanel = null;
    if (addMembers || members) {
      membersPanel = (
        <ThreadSettingsCategory type="unpadded" title="Members">
          <View style={styles.itemList}>
            {addMembers}
            {members}
          </View>
        </ThreadSettingsCategory>
      );
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

    let addChildThread = null;
    if (permissions[threadPermissions.CREATE_SUBTHREADS]) {
      addChildThread = (
        <View style={styles.addItemRow}>
          <ThreadSettingsListAction
            onPress={this.onPressAddChildThread}
            text="Add child thread"
            iconName="md-add"
            iconColor="#009900"
            iconSize={20}
          />
        </View>
      );
    }

    let childThreadPanel = null;
    if (addChildThread || childThreads) {
      childThreadPanel = (
        <ThreadSettingsCategory type="unpadded" title="Child threads">
          <View style={styles.itemList}>
            {addChildThread}
            {childThreads}
          </View>
        </ThreadSettingsCategory>
      );
    }

    return (
      <View>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <ThreadSettingsCategory type="full" title="Basics">
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              {name}
            </View>
            <View style={styles.colorRow}>
              <Text style={[styles.label, styles.colorLine]}>Color</Text>
              <View style={styles.currentValue}>
                <ColorSplotch color={this.props.threadInfo.color} />
              </View>
              {colorButton}
            </View>
          </ThreadSettingsCategory>
          {descriptionPanel}
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
          {childThreadPanel}
          {membersPanel}
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
        <ColorPickerModal
          isVisible={this.state.showEditColorModal}
          closeModal={this.closeColorPicker}
          color={this.state.colorEditValue}
          oldColor={this.props.threadInfo.color}
          onColorSelected={this.onColorSelected}
        />
      </View>
    );
  }

  nameTextInputRef = (nameTextInput: ?TextInput) => {
    this.nameTextInput = nameTextInput;
  }

  onLayoutNameText = (
    event: { nativeEvent: { layout: { height: number } } },
  ) => {
    this.setState({ nameTextHeight: event.nativeEvent.layout.height });
  }

  onNameTextInputContentSizeChange = (
    event: { nativeEvent: { contentSize: { height: number } } },
  ) => {
    this.setState({ nameTextHeight: event.nativeEvent.contentSize.height });
  }

  onPressEditName = () => {
    this.setState({ nameEditValue: this.props.threadInfo.name });
  }

  onChangeNameText = (text: string) => {
    this.setState({ nameEditValue: text });
  }

  submitNameEdit = () => {
    invariant(
      this.state.nameEditValue !== null &&
        this.state.nameEditValue !== undefined,
      "should be set",
    );
    const name = this.state.nameEditValue.trim();

    if (name === this.props.threadInfo.name) {
      this.setState({ nameEditValue: null });
      return;
    } else if (name === '') {
      Alert.alert(
        "Empty thread name",
        "You must specify a thread name!",
        [
          { text: 'OK', onPress: this.onNameErrorAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    }

    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editName(name),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:name` },
    );
  }

  async editName(newName: string) {
    try {
      const result = await this.props.changeSingleThreadSetting(
        this.props.threadInfo.id,
        "name",
        newName,
      );
      this.setState({ nameEditValue: null });
      return result;
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onNameErrorAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onNameErrorAcknowledged = () => {
    this.setState(
      { nameEditValue: this.props.threadInfo.name },
      () => {
        invariant(this.nameTextInput, "nameTextInput should be set");
        this.nameTextInput.focus();
      },
    );
  }

  onPressEditColor = () => {
    this.setState({ showEditColorModal: true });
  }

  closeColorPicker = () => {
    this.setState({ showEditColorModal: false });
  }

  onColorSelected = (color: string) => {
    const colorEditValue = color.substr(1);
    this.setState({ showEditColorModal: false, colorEditValue });
    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editColor(colorEditValue),
      { customKeyName: `${changeThreadSettingsActionTypes.started}:color` },
    );
  }

  async editColor(newColor: string) {
    try {
      return await this.props.changeSingleThreadSetting(
        this.props.threadInfo.id,
        "color",
        newColor,
      );
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onColorErrorAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onColorErrorAcknowledged = () => {
    this.setState({ colorEditValue: this.props.threadInfo.color });
  }

  descriptionTextInputRef = (descriptionTextInput: ?TextInput) => {
    this.descriptionTextInput = descriptionTextInput;
  }

  onLayoutDescriptionText = (
    event: { nativeEvent: { layout: { height: number } } },
  ) => {
    this.setState({ descriptionTextHeight: event.nativeEvent.layout.height });
  }

  onDescriptionTextInputContentSizeChange = (
    event: { nativeEvent: { contentSize: { height: number } } },
  ) => {
    this.setState({
      descriptionTextHeight: event.nativeEvent.contentSize.height,
    });
  }

  onPressEditDescription = () => {
    this.setState({ descriptionEditValue: this.props.threadInfo.description });
  }

  onChangeDescriptionText = (text: string) => {
    this.setState({ descriptionEditValue: text });
  }

  submitDescriptionEdit = () => {
    invariant(
      this.state.descriptionEditValue !== null &&
        this.state.descriptionEditValue !== undefined,
      "should be set",
    );
    const description = this.state.descriptionEditValue.trim();

    if (description === this.props.threadInfo.description) {
      this.setState({ descriptionEditValue: null });
      return;
    }

    this.props.dispatchActionPromise(
      changeThreadSettingsActionTypes,
      this.editDescription(description),
      {
        customKeyName: `${changeThreadSettingsActionTypes.started}:description`,
      },
    );
  }

  async editDescription(newDescription: string) {
    try {
      const result = await this.props.changeSingleThreadSetting(
        this.props.threadInfo.id,
        "description",
        newDescription,
      );
      this.setState({ descriptionEditValue: null });
      return result;
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onDescriptionErrorAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onDescriptionErrorAcknowledged = () => {
    this.setState(
      { descriptionEditValue: this.props.threadInfo.description },
      () => {
        invariant(
          this.descriptionTextInput,
          "descriptionTextInput should be set",
        );
        this.descriptionTextInput.focus();
      },
    );
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
    lineHeight: Platform.select({ android: 22, default: 25 }),
  },
  currentValue: {
    flex: 1,
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
    paddingRight: 0,
    paddingVertical: 0,
    margin: 0,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
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
  addDescriptionText: {
    fontSize: 16,
    color: "#888888",
    flex: 1,
  },
  addDescriptionButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  editIcon: {
    textAlign: 'right',
    paddingLeft: 10,
  },
  descriptionText: {
    flex: 1,
    paddingLeft: 0,
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
      nameEditLoadingStatus: createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:name`,
      )(state),
      colorEditLoadingStatus: createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:color`,
      )(state),
      descriptionEditLoadingStatus: createLoadingStatusSelector(
        changeThreadSettingsActionTypes,
        `${changeThreadSettingsActionTypes.started}:description`,
      )(state),
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ changeSingleThreadSetting }),
)(InnerThreadSettings);

export {
  ThreadSettings,
  ThreadSettingsRouteName,
};
