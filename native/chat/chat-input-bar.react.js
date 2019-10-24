// @flow

import type { AppState } from '../redux/redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import {
  type RawTextMessageInfo,
  type SendMessageResult,
  messageTypes,
} from 'lib/types/message-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  threadPermissions,
  type ClientThreadJoinRequest,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { KeyboardEvent } from '../keyboard';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../navigation/keyboard-state';
import type { Styles } from '../types/styles';
import { type GlobalTheme, globalThemePropType } from '../types/themes';

import * as React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  Text,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import invariant from 'invariant';
import Animated, { Easing } from 'react-native-reanimated';
import {
  KeyboardAccessoryView,
  TextInputKeyboardMangerIOS,
} from 'react-native-keyboard-input';

import { connect } from 'lib/utils/redux-utils';
import {
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions';
import { saveDraftActionType } from 'lib/actions/miscellaneous-action-types';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import {
  joinThreadActionTypes,
  joinThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import { nonThreadCalendarQuery } from '../selectors/nav-selectors';
import { getKeyboardHeight } from '../keyboard';
import {
  imageGalleryKeyboardName,
  imageGalleryBackgroundColor,
} from '../media/image-gallery-keyboard.react';
import { ChatInputStateContext } from './chat-input-state';
import { colors, styleSelector } from '../themes/colors';

const draftKeyFromThreadID =
  (threadID: string) => `${threadID}/message_composer`;

type Props = {|
  threadInfo: ThreadInfo,
  // Redux state
  viewerID: ?string,
  draft: string,
  joinThreadLoadingStatus: LoadingStatus,
  calendarQuery: () => CalendarQuery,
  nextLocalID: number,
  activeTheme: ?GlobalTheme,
  styles: Styles,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
  ) => Promise<SendMessageResult>,
  joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
|};
type State = {|
  text: string,
  height: number,
  buttonsExpanded: bool,
|};
class ChatInputBar extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    viewerID: PropTypes.string,
    draft: PropTypes.string.isRequired,
    joinThreadLoadingStatus: loadingStatusPropType.isRequired,
    calendarQuery: PropTypes.func.isRequired,
    nextLocalID: PropTypes.number.isRequired,
    activeTheme: globalThemePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    keyboardState: keyboardStatePropType,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendTextMessage: PropTypes.func.isRequired,
    joinThread: PropTypes.func.isRequired,
  };
  static contextType = ChatInputStateContext;
  static kbInitialProps = {
    backgroundColor: imageGalleryBackgroundColor,
  };
  textInput: ?TextInput;
  cameraRollOpacity: Animated.Value;
  expandOpacity: Animated.Value;
  expandoButtonsWidth: Animated.Value;

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.draft,
      height: 0,
      buttonsExpanded: true,
    };
    this.cameraRollOpacity = new Animated.Value(1);
    this.expandOpacity = Animated.sub(1, this.cameraRollOpacity);
    this.expandoButtonsWidth = Animated.interpolate(
      this.cameraRollOpacity,
      {
        inputRange: [ 0, 1 ],
        outputRange: [ 22, 28 ],
      },
    );
  }

  static imageGalleryOpen(props: Props) {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.imageGalleryOpen);
  }

  static systemKeyboardShowing(props: Props) {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.systemKeyboardShowing);
  }

  get systemKeyboardShowing() {
    return ChatInputBar.systemKeyboardShowing(this.props);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const currentText = this.state.text.trim();
    const prevText = prevState.text.trim();
    if (
      currentText === "" && prevText !== "" ||
      currentText !== "" && prevText === ""
    ) {
      LayoutAnimation.easeInEaseOut();
    }

    const systemKeyboardIsShowing =
      ChatInputBar.systemKeyboardShowing(this.props);
    const systemKeyboardWasShowing =
      ChatInputBar.systemKeyboardShowing(prevProps);
    if (systemKeyboardIsShowing && !systemKeyboardWasShowing) {
      this.hideButtons();
    } else if (!systemKeyboardIsShowing && systemKeyboardWasShowing) {
      this.expandButtons();
    }

    const imageGalleryIsOpen = ChatInputBar.imageGalleryOpen(this.props);
    const imageGalleryWasOpen = ChatInputBar.imageGalleryOpen(prevProps);
    if (!imageGalleryIsOpen && imageGalleryWasOpen) {
      this.hideButtons();
    } else if (imageGalleryIsOpen && !imageGalleryWasOpen) {
      this.expandButtons();
      this.setIOSKeyboardHeight();
    }
  }

  setIOSKeyboardHeight() {
    if (Platform.OS !== "ios" || this.systemKeyboardShowing) {
      return;
    }
    const { textInput } = this;
    if (!textInput) {
      return;
    }
    const keyboardHeight = getKeyboardHeight();
    if (keyboardHeight === null || keyboardHeight === undefined) {
      return;
    }
    TextInputKeyboardMangerIOS.setKeyboardHeight(textInput, keyboardHeight);
  }

  get textInputStyle() {
    return { height: Math.max(this.state.height, 30) };
  }

  get expandoButtonsStyle() {
    return {
      ...this.props.styles.expandoButtons,
      width: this.expandoButtonsWidth,
    };
  }

  get cameraRollIconStyle() {
    return {
      ...this.props.styles.cameraRollIcon,
      opacity: this.cameraRollOpacity,
    };
  }

  get expandIconStyle() {
    return {
      ...this.props.styles.expandIcon,
      opacity: this.expandOpacity,
    };
  }

  render() {
    const isMember = viewerIsMember(this.props.threadInfo);
    let joinButton = null;
    if (
      !isMember &&
      threadHasPermission(this.props.threadInfo, threadPermissions.JOIN_THREAD)
    ) {
      let buttonContent;
      if (this.props.joinThreadLoadingStatus === "loading") {
        buttonContent = (
          <ActivityIndicator
            size="small"
            color="white"
            style={this.props.styles.joinThreadLoadingIndicator}
          />
        );
      } else {
        buttonContent = (
          <Text style={this.props.styles.joinButtonText}>Join Thread</Text>
        );
      }
      joinButton = (
        <View style={this.props.styles.joinButtonContainer}>
          <Button
            onPress={this.onPressJoin}
            iosActiveOpacity={0.5}
            style={this.props.styles.joinButton}
          >
            {buttonContent}
          </Button>
        </View>
      );
    }

    let content;
    if (threadHasPermission(this.props.threadInfo, threadPermissions.VOICED)) {
      const themeColors =
        this.props.activeTheme === 'dark' ? colors.dark : colors.light;

      let button = null;
      if (this.state.text.trim()) {
        button = (
          <TouchableOpacity
            onPress={this.onSend}
            activeOpacity={0.4}
            style={this.props.styles.bottomAligned}
          >
            <Icon
              name="md-send"
              size={25}
              style={this.props.styles.sendIcon}
              color={themeColors.greenButton}
            />
          </TouchableOpacity>
        );
      }
      content = (
        <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
          <View style={this.props.styles.inputContainer}>
            <Animated.View style={this.expandoButtonsStyle}>
              <TouchableOpacity
                onPress={this.onRightmostButtonPress}
                activeOpacity={0.4}
                style={this.props.styles.expandoButtons}
              >
                <Animated.View style={this.expandIconStyle}>
                  <FAIcon
                    name="chevron-right"
                    size={19}
                    color={themeColors.listInputButton}
                  />
                </Animated.View>
                <Animated.View style={this.cameraRollIconStyle}>
                  <Icon
                    name="md-image"
                    size={25}
                    color={themeColors.listInputButton}
                  />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
            <View style={this.props.styles.textInputContainer}>
              <TextInput
                value={this.state.text}
                onChangeText={this.updateText}
                underlineColorAndroid="transparent"
                placeholder="Send a message..."
                placeholderTextColor={themeColors.listInputButton}
                multiline={true}
                onContentSizeChange={this.onContentSizeChange}
                style={[this.props.styles.textInput, this.textInputStyle]}
                ref={this.textInputRef}
              />
            </View>
            {button}
          </View>
        </TouchableWithoutFeedback>
      );
    } else if (isMember) {
      content = (
        <Text style={this.props.styles.explanation}>
          You don't have permission to send messages.
        </Text>
      );
    } else {
      const defaultRoleID = Object.keys(this.props.threadInfo.roles)
        .find(roleID => this.props.threadInfo.roles[roleID].isDefault);
      invariant(
        defaultRoleID !== undefined,
        "all threads should have a default role",
      );
      const defaultRole = this.props.threadInfo.roles[defaultRoleID];
      const membersAreVoiced =
        !!defaultRole.permissions[threadPermissions.VOICED];
      if (membersAreVoiced) {
        content = (
          <Text style={this.props.styles.explanation}>
            Join this thread to send messages.
          </Text>
        );
      } else {
        content = (
          <Text style={this.props.styles.explanation}>
            You don't have permission to send messages.
          </Text>
        );
      }
    }

    let keyboardAccessoryView = null;
    const imageGalleryIsOpen = ChatInputBar.imageGalleryOpen(this.props);
    if (Platform.OS !== "android" || imageGalleryIsOpen) {
      const kbComponent = imageGalleryIsOpen ? imageGalleryKeyboardName : null;
      keyboardAccessoryView = (
        <KeyboardAccessoryView
          kbInputRef={this.textInput}
          kbComponent={kbComponent}
          kbInitialProps={ChatInputBar.kbInitialProps}
          onItemSelected={this.onImageGalleryItemSelected}
          onKeyboardResigned={this.hideCustomKeyboard}
          manageScrollView={false}
        />
      );
    }

    return (
      <View style={this.props.styles.container}>
        {joinButton}
        {content}
        {keyboardAccessoryView}
      </View>
    );
  }

  textInputRef = (textInput: ?TextInput) => {
    this.textInput = textInput;
  }

  updateText = (text: string) => {
    this.setState({ text });
    this.props.dispatchActionPayload(
      saveDraftActionType,
      { key: draftKeyFromThreadID(this.props.threadInfo.id), draft: text },
    );
  }

  onContentSizeChange = (event) => {
    let height = event.nativeEvent.contentSize.height;
    // iOS doesn't include the margin on this callback
    height = Platform.OS === "ios" ? height + 10 : height;
    this.setState({ height });
  }

  onSend = () => {
    const text = this.state.text.trim();
    if (!text) {
      return;
    }
    this.updateText("");
    const localID = `local${this.props.nextLocalID}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, "should have viewer ID in order to send a message");
    const messageInfo = ({
      type: messageTypes.TEXT,
      localID,
      threadID: this.props.threadInfo.id,
      text,
      creatorID,
      time: Date.now(),
    }: RawTextMessageInfo);
    this.props.dispatchActionPromise(
      sendTextMessageActionTypes,
      this.sendTextMessageAction(messageInfo),
      undefined,
      messageInfo,
    );
  }

  async sendTextMessageAction(messageInfo: RawTextMessageInfo) {
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        "localID should be set",
      );
      const result = await this.props.sendTextMessage(
        messageInfo.threadID,
        localID,
        messageInfo.text,
      );
      return {
        localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = messageInfo.localID;
      e.threadID = messageInfo.threadID;
      throw e;
    }
  }

  onPressJoin = () => {
    this.props.dispatchActionPromise(
      joinThreadActionTypes,
      this.joinAction(),
    );
  }

  async joinAction() {
    const query = this.props.calendarQuery();
    return await this.props.joinThread({
      threadID: this.props.threadInfo.id,
      calendarQuery: {
        startDate: query.startDate,
        endDate: query.endDate,
        filters: [
          ...query.filters,
          { type: "threads", threadIDs: [this.props.threadInfo.id] },
        ],
      },
    });
  }

  expandButtons() {
    if (this.state.buttonsExpanded) {
      return;
    }
    Animated.timing(
      this.cameraRollOpacity,
      { duration: 500, toValue: 1, easing: Easing.inOut(Easing.ease) },
    ).start();
    this.setState({ buttonsExpanded: true });
  }

  hideButtons() {
    if (
      ChatInputBar.imageGalleryOpen(this.props) ||
      !this.systemKeyboardShowing ||
      !this.state.buttonsExpanded
    ) {
      return;
    }
    Animated.timing(
      this.cameraRollOpacity,
      { duration: 500, toValue: 0, easing: Easing.inOut(Easing.ease) },
    ).start();
    this.setState({ buttonsExpanded: false });
  }

  onRightmostButtonPress = () => {
    if (!this.state.buttonsExpanded) {
      this.expandButtons();
    } else {
      this.setImageGalleryOpen(true);
    }
  }

  hideCustomKeyboard = () => {
    this.setImageGalleryOpen(false);
  }

  onImageGalleryItemSelected = (
    keyboardName: string,
    imageInfos: $ReadOnlyArray<GalleryImageInfo>,
  ) => {
    this.dismissKeyboard();
    const chatInputState = this.context;
    invariant(chatInputState, "chatInputState should be set in ChatInputBar");
    chatInputState.sendMultimediaMessage(this.props.threadInfo.id, imageInfos);
  }

  setImageGalleryOpen(imageGalleryOpen: bool) {
    const { keyboardState } = this.props;
    invariant(keyboardState, "keyboardState should be initialized");
    keyboardState.setImageGalleryOpen(imageGalleryOpen);
  }

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  }

}

const styles = {
  container: {
    backgroundColor: 'listBackground',
  },
  inputContainer: {
    flexDirection: 'row',
  },
  textInputContainer: {
    flex: 1,
  },
  textInput: {
    backgroundColor: 'listInputBackground',
    marginVertical: 5,
    marginHorizontal: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 16,
    borderColor: 'listInputBorder',
    borderWidth: 1,
    color: 'listBackgroundLabel',
  },
  bottomAligned: {
    alignSelf: 'flex-end',
    paddingBottom: Platform.OS === "ios" ? 7 : 9,
  },
  expandoButtons: {
    alignSelf: 'flex-end',
  },
  sendIcon: {
    paddingLeft: 5,
    paddingRight: 8,
  },
  expandIcon: {
    position: 'absolute',
    right: 0,
    bottom: Platform.OS === "ios" ? 10 : 12,
  },
  cameraRollIcon: {
    paddingRight: 2,
    paddingBottom: Platform.OS === "ios" ? 5 : 8,
  },
  explanation: {
    color: 'listBackgroundSecondaryLabel',
    textAlign: 'center',
    paddingTop: 1,
    paddingBottom: 4,
  },
  joinButtonContainer: {
    flexDirection: 'row',
    height: 36,
  },
  joinButton: {
    marginHorizontal: 12,
    marginVertical: 3,
    paddingTop: 3,
    paddingBottom: 5,
    flex: 1,
    backgroundColor: 'mintButton',
    borderRadius: 5,
    justifyContent: 'center',
  },
  joinButtonText: {
    fontSize: 20,
    color: 'listBackground',
    textAlign: 'center',
  },
  joinThreadLoadingIndicator: {
    paddingVertical: 2,
  },
};
const stylesSelector = styleSelector(styles);

const joinThreadLoadingStatusSelector
  = createLoadingStatusSelector(joinThreadActionTypes);

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const draft = state.drafts[draftKeyFromThreadID(ownProps.threadInfo.id)];
    return {
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
      draft: draft ? draft : "",
      joinThreadLoadingStatus: joinThreadLoadingStatusSelector(state),
      calendarQuery: nonThreadCalendarQuery(state),
      nextLocalID: state.nextLocalID,
      activeTheme: state.globalThemeInfo.activeTheme,
      styles: stylesSelector(state),
    };
  },
  { sendTextMessage, joinThread },
)(withKeyboardState(ChatInputBar));
