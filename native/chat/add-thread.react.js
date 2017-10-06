// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation/src/TypeDefinition';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { ThreadInfo, VisibilityRules } from 'lib/types/thread-types';
import { threadInfoPropType, visibilityRules } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';
import { userInfoPropType } from 'lib/types/user-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { SearchUsersResult } from 'lib/actions/user-actions';
import type { NewThreadResult } from 'lib/actions/thread-actions';

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import SegmentedControlTab from 'react-native-segmented-control-tab';
import invariant from 'invariant';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  newThreadActionTypes,
  newChatThread,
} from 'lib/actions/thread-actions';
import {
  searchUsersActionTypes,
  searchUsers,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  userInfoSelectorForOtherMembersOfThread,
  userSearchIndexForOtherMembersOfThread,
} from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';
import { generateRandomColor } from 'lib/shared/thread-utils';
import { getUserSearchResults } from 'lib/shared/search-utils';
import { registerFetchKey } from 'lib/reducers/loading-reducer';

import ColorSplotch from '../components/color-splotch.react';
import TagInput from '../components/tag-input.react';
import UserList from '../components/user-list.react';
import LinkButton from '../components/link-button.react';
import { MessageListRouteName } from './message-list.react';
import { registerChatScreen } from './chat-screen-registry';
import ColorPickerModal from './color-picker-modal.react';
import { assertNavigationRouteNotLeafNode } from '../utils/navigation-utils';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>
  & { state: { params: { parentThreadID: ?string } } };
const segmentedPrivacyOptions = ['Public', 'Secret'];

type Props = {
  navigation: NavProp,
  // Redux state
  loadingStatus: LoadingStatus,
  parentThreadInfo: ?ThreadInfo,
  otherUserInfos: {[id: string]: UserInfo},
  userSearchIndex: SearchIndex,
  secondChatSubrouteKey: ?string,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  newChatThread: (
    name: string,
    ourVisibilityRules: VisibilityRules,
    color: string,
    userIDs: string[],
    parentThreadID: ?string,
  ) => Promise<NewThreadResult>,
  searchUsers: (usernamePrefix: string) => Promise<SearchUsersResult>,
};
type State = {
  nameInputText: string,
  usernameInputText: string,
  userInfoInputArray: $ReadOnlyArray<UserInfo>,
  userSearchResults: $ReadOnlyArray<UserInfo>,
  selectedPrivacyIndex: number,
  tagInputHeight: number,
  showColorPicker: bool,
  color: string,
};
class InnerAddThread extends React.PureComponent {

  props: Props;
  state: State;
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
        params: PropTypes.shape({
          parentThreadID: PropTypes.string,
        }).isRequired,
      }).isRequired,
      setParams: PropTypes.func.isRequired,
      goBack: PropTypes.func.isRequired,
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    parentThreadInfo: threadInfoPropType,
    otherUserInfos: PropTypes.objectOf(userInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
    secondChatSubrouteKey: PropTypes.string,
    dispatchActionPromise: PropTypes.func.isRequired,
    newChatThread: PropTypes.func.isRequired,
    searchUsers: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    title: 'New thread',
    headerRight: navigation.state.params.showColorPicker
      ? null
      : (
          <LinkButton
            text="Create"
            onPress={() => navigation.state.params.onPressCreateThread()}
          />
        ),
  });
  mounted = false;
  nameInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    const userSearchResults = getUserSearchResults(
      "",
      props.otherUserInfos,
      props.userSearchIndex,
      [],
    );
    this.state = {
      nameInputText: "",
      usernameInputText: "",
      userInfoInputArray: [],
      userSearchResults,
      selectedPrivacyIndex: props.parentThreadInfo ? 0 : 1,
      tagInputHeight: 36,
      showColorPicker: false,
      color: props.parentThreadInfo
        ? props.parentThreadInfo.color
        : generateRandomColor(),
    };
  }

  componentDidMount() {
    this.mounted = true;
    registerChatScreen(this.props.navigation.state.key, this);
    this.searchUsers("");
    this.props.navigation.setParams({
      onPressCreateThread: this.onPressCreateThread,
    });
  }

  componentWillUnmount() {
    this.mounted = false;
    registerChatScreen(this.props.navigation.state.key, null);
  }

  canReset = () => false;

  componentWillReceiveProps(nextProps: Props) {
    if (!this.mounted) {
      return;
    }
    if (
      this.props.otherUserInfos !== nextProps.otherUserInfos ||
      this.props.userSearchIndex !== nextProps.userSearchIndex
    ) {
      const userSearchResults = getUserSearchResults(
        this.state.usernameInputText,
        nextProps.otherUserInfos,
        nextProps.userSearchIndex,
        this.state.userInfoInputArray.map(userInfo => userInfo.id),
      );
      this.setState({ userSearchResults });
    }
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (this.state.showColorPicker !== nextState.showColorPicker) {
      nextProps.navigation.setParams({
        showColorPicker: nextState.showColorPicker,
      });
    }
  }

  render() {
    let visibility;
    if (this.props.parentThreadInfo) {
      visibility = (
        <View style={styles.row}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.input}>
            <SegmentedControlTab
              values={segmentedPrivacyOptions}
              selectedIndex={this.state.selectedPrivacyIndex}
              onTabPress={this.handleIndexChange}
              tabStyle={styles.segmentedTabStyle}
              activeTabStyle={styles.segmentedActiveTabStyle}
              tabTextStyle={styles.segmentedTextStyle}
            />
            <Text
              style={styles.parentThreadName}
              numberOfLines={1}
            >
              <Text style={styles.parentThreadNameRobotext}>
                {"within "}
              </Text>
              {this.props.parentThreadInfo.name}
            </Text>
          </View>
        </View>
      );
    }
    const oldColor = this.props.parentThreadInfo
      ? this.props.parentThreadInfo.color
      : null;
    const content = (
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.input}>
            <TextInput
              style={styles.textInput}
              value={this.state.nameInputText}
              onChangeText={this.onChangeNameInputText}
              placeholder="thread name"
              autoFocus={true}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="ascii-capable"
              returnKeyType="next"
              editable={this.props.loadingStatus !== "loading"}
              underlineColorAndroid="transparent"
              ref={this.nameInputRef}
            />
          </View>
        </View>
        {visibility}
        <View style={styles.row}>
          <Text style={styles.label}>Color</Text>
          <View style={[styles.input, styles.inlineInput]}>
            <ColorSplotch color={this.state.color} />
            <LinkButton
              text="Change"
              onPress={this.onPressChangeColor}
              style={styles.changeColorButton}
            />
          </View>
        </View>
        <View style={[styles.row, { height: this.state.tagInputHeight }]}>
          <Text style={styles.tagInputLabel}>People</Text>
          <View style={styles.input}>
            <TagInput
              onChange={this.onChangeTagInput}
              value={this.state.userInfoInputArray}
              text={this.state.usernameInputText}
              setText={this.setUsernameInputText}
              onHeightChange={this.onTagInputHeightChange}
              labelExtractor={this.tagDataLabelExtractor}
            />
          </View>
        </View>
        <View style={styles.userList}>
          <UserList
            userInfos={this.state.userSearchResults}
            onSelect={this.onUserSelect}
          />
        </View>
        <ColorPickerModal
          isVisible={this.state.showColorPicker}
          closeModal={this.closeColorPicker}
          color={this.state.color}
          oldColor={oldColor}
          onColorSelected={this.onColorSelected}
        />
      </View>
    );
    if (Platform.OS === "ios") {
      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          keyboardVerticalOffset={65}
        >{content}</KeyboardAvoidingView>
      );
    } else {
      return <View style={styles.container}>{content}</View>;
    }
  }

  nameInputRef = (nameInput: ?TextInput) => {
    this.nameInput = nameInput;
  }

  onChangeNameInputText = (text: string) => {
    this.setState({ nameInputText: text });
  }

  onChangeTagInput = (userInfoInputArray: $ReadOnlyArray<UserInfo>) => {
    const userSearchResults = getUserSearchResults(
      this.state.usernameInputText,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray.map(userInfo => userInfo.id),
    );
    this.setState({ userInfoInputArray, userSearchResults });
  }

  tagDataLabelExtractor = (userInfo: UserInfo) => userInfo.username;

  handleIndexChange = (index: number) => {
    this.setState({ selectedPrivacyIndex: index });
  }

  setUsernameInputText = (text: string) => {
    const userSearchResults = getUserSearchResults(
      text,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      this.state.userInfoInputArray.map(userInfo => userInfo.id),
    );
    this.searchUsers(text);
    this.setState({ usernameInputText: text, userSearchResults });
  }

  searchUsers(usernamePrefix: string) {
    this.props.dispatchActionPromise(
      searchUsersActionTypes,
      this.props.searchUsers(usernamePrefix),
    );
  }

  onUserSelect = (userID: string) => {
    for (let existingUserInfo of this.state.userInfoInputArray) {
      if (userID === existingUserInfo.id) {
        return;
      }
    }
    const userInfoInputArray = [
      ...this.state.userInfoInputArray,
      this.props.otherUserInfos[userID],
    ];
    const userSearchResults = getUserSearchResults(
      "",
      this.props.otherUserInfos,
      this.props.userSearchIndex,
      userInfoInputArray.map(userInfo => userInfo.id),
    );
    this.setState({
      userInfoInputArray,
      usernameInputText: "",
      userSearchResults,
    });
  }

  onTagInputHeightChange = (height: number) => {
    this.setState({ tagInputHeight: height });
  }

  onPressChangeColor = () => {
    this.setState({ showColorPicker: true });
  }

  onColorSelected = (color: string) => {
    this.setState({
      showColorPicker: false,
      color: color.substr(1),
    });
  }

  closeColorPicker = () => {
    this.setState({ showColorPicker: false });
  }

  onPressCreateThread = () => {
    const name = this.state.nameInputText.trim();
    if (name === '') {
      Alert.alert(
        "Empty thread name",
        "You must specify a thread name!",
        [
          { text: 'OK', onPress: this.onErrorAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    }

    this.props.dispatchActionPromise(
      newThreadActionTypes,
      this.newChatThreadAction(name),
    );
  }

  async newChatThreadAction(name: string) {
    try {
      const response = await this.props.newChatThread(
        name,
        this.state.selectedPrivacyIndex === 0
          ? visibilityRules.CHAT_NESTED_OPEN
          : visibilityRules.CHAT_SECRET,
        this.state.color,
        this.state.userInfoInputArray.map((userInfo: UserInfo) => userInfo.id),
        this.props.parentThreadInfo ? this.props.parentThreadInfo.id : null,
      );
      const secondChatSubrouteKey = this.props.secondChatSubrouteKey;
      invariant(secondChatSubrouteKey, "should be set");
      this.props.navigation.goBack(secondChatSubrouteKey);
      this.props.navigation.navigate(
        MessageListRouteName,
        { threadInfo: response.newThreadInfo },
      );
      return response;
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onErrorAcknowledged = () => {
    invariant(this.nameInput, "nameInput should be set");
    this.nameInput.focus();
  }

  onUnknownErrorAlertAcknowledged = () => {
    this.setState(
      {
        nameInputText: "",
        usernameInputText: "",
        userSearchResults: [],
        selectedPrivacyIndex: 0,
        tagInputHeight: 36,
      },
      this.onErrorAcknowledged,
    );
  }

}

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingRight: 12,
  },
  inlineInput: {
    flexDirection: 'row',
  },
  label: {
    paddingTop: 2,
    paddingLeft: 12,
    fontSize: 20,
    width: 100,
  },
  tagInputLabel: {
    paddingTop: 2,
    paddingLeft: 12,
    fontSize: 20,
    width: 100,
  },
  textInput: {
    fontSize: 18,
    paddingTop: 4,
    paddingBottom: 0,
    paddingHorizontal: 0,
    margin: 0,
  },
  parentThreadName: {
    paddingTop: 5,
    fontSize: 18,
  },
  parentThreadNameRobotext: {
    color: '#AAAAAA',
  },
  segmentedTabStyle: {
    borderColor: '#777',
  },
  segmentedActiveTabStyle: {
    backgroundColor: '#777',
  },
  segmentedTextStyle: {
    color: '#777',
  },
  colorPicker: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    position: 'absolute',
  },
  changeColorButton: {
    paddingTop: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  closeButtonIcon: {
    position: 'absolute',
    left: 3,
  },
  userList: {
    marginLeft: 88,
    marginRight: 12,
  },
});

const AddThreadRouteName = 'AddThread';

const loadingStatusSelector
  = createLoadingStatusSelector(newThreadActionTypes);
registerFetchKey(searchUsersActionTypes);

const AddThread = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    let parentThreadInfo = null;
    const parentThreadID = ownProps.navigation.state.params.parentThreadID;
    if (parentThreadID) {
      parentThreadInfo = state.threadInfos[parentThreadID];
      invariant(parentThreadInfo, "parent thread should exist");
    }
    const appRoute =
      assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
    const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
    const secondChatSubroute = chatRoute.routes[1];
    return {
      loadingStatus: loadingStatusSelector(state),
      parentThreadInfo,
      otherUserInfos:
        userInfoSelectorForOtherMembersOfThread(parentThreadID)(state),
      userSearchIndex:
        userSearchIndexForOtherMembersOfThread(parentThreadID)(state),
      secondChatSubrouteKey: secondChatSubroute && secondChatSubroute.key
        ? secondChatSubroute.key
        : null,
      cookie: state.cookie,
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ newChatThread, searchUsers }),
)(InnerAddThread);

export {
  AddThread,
  AddThreadRouteName,
};
