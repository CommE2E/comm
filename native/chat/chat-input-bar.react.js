// @flow

import type { AppState } from '../redux/redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import { messageTypes } from 'lib/types/message-types';
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
import {
  type KeyboardState,
  keyboardStatePropType,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import {
  messageListRoutePropType,
  messageListNavPropType,
} from './message-list-types';
import {
  type InputState,
  inputStatePropType,
  withInputState,
} from '../input/input-state';
import type { ChatNavigationProp } from './chat.react';
import type { NavigationRoute } from '../navigation/route-names';

import * as React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
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
import { TextInputKeyboardMangerIOS } from 'react-native-keyboard-input';
import _throttle from 'lodash/throttle';

import { connect } from 'lib/utils/redux-utils';
import { saveDraftActionType } from 'lib/actions/miscellaneous-action-types';
import { threadHasPermission, viewerIsMember } from 'lib/shared/thread-utils';
import { joinThreadActionTypes, joinThread } from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { trimMessage } from 'lib/shared/message-utils';

import Button from '../components/button.react';
import { nonThreadCalendarQuery } from '../navigation/nav-selectors';
import { getKeyboardHeight } from '../keyboard/keyboard';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import { CameraModalRouteName } from '../navigation/route-names';
import KeyboardInputHost from '../keyboard/keyboard-input-host.react';
import {
  connectNav,
  type NavContextType,
} from '../navigation/navigation-context';
import ClearableTextInput from '../components/clearable-text-input.react';

const draftKeyFromThreadID = (threadID: string) =>
  `${threadID}/message_composer`;

type Props = {|
  threadInfo: ThreadInfo,
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
  // Redux state
  viewerID: ?string,
  draft: string,
  joinThreadLoadingStatus: LoadingStatus,
  calendarQuery: () => CalendarQuery,
  nextLocalID: number,
  colors: Colors,
  styles: typeof styles,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
  // withInputState
  inputState: ?InputState,
|};
type State = {|
  text: string,
  buttonsExpanded: boolean,
|};
class ChatInputBar extends React.PureComponent<Props, State> {
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigation: messageListNavPropType.isRequired,
    route: messageListRoutePropType.isRequired,
    viewerID: PropTypes.string,
    draft: PropTypes.string.isRequired,
    joinThreadLoadingStatus: loadingStatusPropType.isRequired,
    calendarQuery: PropTypes.func.isRequired,
    nextLocalID: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    keyboardState: keyboardStatePropType,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    joinThread: PropTypes.func.isRequired,
    inputState: inputStatePropType,
  };
  textInput: ?React.ElementRef<typeof TextInput>;
  clearableTextInput: ?ClearableTextInput;
  expandOpacity: Animated.Value;
  expandoButtonsOpacity: Animated.Value;
  expandoButtonsWidth: Animated.Value;
  sendButtonContainerOpen: Animated.Value;
  sendButtonContainerWidth: Animated.Value;

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.draft,
      buttonsExpanded: true,
    };

    // eslint-disable-next-line import/no-named-as-default-member
    this.expandoButtonsOpacity = new Animated.Value(1);
    this.expandOpacity = Animated.sub(1, this.expandoButtonsOpacity);
    this.expandoButtonsWidth = Animated.interpolate(
      this.expandoButtonsOpacity,
      {
        inputRange: [0, 1],
        outputRange: [22, 60],
      },
    );

    // eslint-disable-next-line import/no-named-as-default-member
    this.sendButtonContainerOpen = new Animated.Value(
      trimMessage(props.draft) ? 1 : 0,
    );
    this.sendButtonContainerWidth = Animated.interpolate(
      this.sendButtonContainerOpen,
      {
        inputRange: [0, 1],
        outputRange: [4, 38],
      },
    );
  }

  static mediaGalleryOpen(props: Props) {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.mediaGalleryOpen);
  }

  static systemKeyboardShowing(props: Props) {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.systemKeyboardShowing);
  }

  get systemKeyboardShowing() {
    return ChatInputBar.systemKeyboardShowing(this.props);
  }

  updateSendButton(currentText: string) {
    // eslint-disable-next-line import/no-named-as-default-member
    Animated.timing(this.sendButtonContainerOpen, {
      duration: 150,
      toValue: currentText === '' ? 0 : 1,
      easing: Easing.inOut(Easing.ease),
    }).start();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const currentText = trimMessage(this.state.text);
    const prevText = trimMessage(prevState.text);
    if (
      (currentText === '' && prevText !== '') ||
      (currentText !== '' && prevText === '')
    ) {
      this.updateSendButton(currentText);
    }

    const systemKeyboardIsShowing = ChatInputBar.systemKeyboardShowing(
      this.props,
    );
    const systemKeyboardWasShowing = ChatInputBar.systemKeyboardShowing(
      prevProps,
    );
    if (systemKeyboardIsShowing && !systemKeyboardWasShowing) {
      this.hideButtons();
    } else if (!systemKeyboardIsShowing && systemKeyboardWasShowing) {
      this.expandButtons();
    }

    const imageGalleryIsOpen = ChatInputBar.mediaGalleryOpen(this.props);
    const imageGalleryWasOpen = ChatInputBar.mediaGalleryOpen(prevProps);
    if (!imageGalleryIsOpen && imageGalleryWasOpen) {
      this.hideButtons();
    } else if (imageGalleryIsOpen && !imageGalleryWasOpen) {
      this.expandButtons();
      this.setIOSKeyboardHeight();
    }
  }

  setIOSKeyboardHeight() {
    if (Platform.OS !== 'ios') {
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

  get expandoButtonsStyle() {
    return {
      ...this.props.styles.expandoButtons,
      width: this.expandoButtonsWidth,
    };
  }

  get cameraRollIconStyle() {
    return {
      ...this.props.styles.cameraRollIcon,
      opacity: this.expandoButtonsOpacity,
    };
  }

  get cameraIconStyle() {
    return {
      ...this.props.styles.cameraIcon,
      opacity: this.expandoButtonsOpacity,
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
      if (this.props.joinThreadLoadingStatus === 'loading') {
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
      content = this.renderInput();
    } else if (isMember) {
      content = (
        <Text style={this.props.styles.explanation}>
          You don&apos;t have permission to send messages.
        </Text>
      );
    } else {
      const defaultRoleID = Object.keys(this.props.threadInfo.roles).find(
        roleID => this.props.threadInfo.roles[roleID].isDefault,
      );
      invariant(
        defaultRoleID !== undefined,
        'all threads should have a default role',
      );
      const defaultRole = this.props.threadInfo.roles[defaultRoleID];
      const membersAreVoiced = !!defaultRole.permissions[
        threadPermissions.VOICED
      ];
      if (membersAreVoiced) {
        content = (
          <Text style={this.props.styles.explanation}>
            Join this thread to send messages.
          </Text>
        );
      } else {
        content = (
          <Text style={this.props.styles.explanation}>
            You don&apos;t have permission to send messages.
          </Text>
        );
      }
    }

    const keyboardInputHost =
      Platform.OS === 'android' ? null : (
        <KeyboardInputHost textInputRef={this.textInput} />
      );

    return (
      <View style={this.props.styles.container}>
        {joinButton}
        {content}
        {keyboardInputHost}
      </View>
    );
  }

  renderInput() {
    const expandoButton = (
      <TouchableOpacity
        onPress={this.expandButtons}
        activeOpacity={0.4}
        style={this.props.styles.expandButton}
      >
        <Animated.View style={this.expandIconStyle}>
          <FAIcon
            name="chevron-right"
            size={19}
            color={this.props.colors.listInputButton}
          />
        </Animated.View>
      </TouchableOpacity>
    );
    const sendButtonContainerStyle = { width: this.sendButtonContainerWidth };
    return (
      <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
        <View style={this.props.styles.inputContainer}>
          <Animated.View style={this.expandoButtonsStyle}>
            <View style={this.props.styles.innerExpandoButtons}>
              {this.state.buttonsExpanded ? expandoButton : null}
              <TouchableOpacity
                onPress={this.showMediaGallery}
                activeOpacity={0.4}
              >
                <Animated.View style={this.cameraRollIconStyle}>
                  <Icon
                    name="md-image"
                    size={25}
                    color={this.props.colors.listInputButton}
                  />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={this.openCamera}
                activeOpacity={0.4}
                disabled={!this.state.buttonsExpanded}
              >
                <Animated.View style={this.cameraIconStyle}>
                  <FAIcon
                    name="camera"
                    size={20}
                    color={this.props.colors.listInputButton}
                  />
                </Animated.View>
              </TouchableOpacity>
              {this.state.buttonsExpanded ? null : expandoButton}
            </View>
          </Animated.View>
          <ClearableTextInput
            value={this.state.text}
            onChangeText={this.updateText}
            underlineColorAndroid="transparent"
            placeholder="Send a message..."
            placeholderTextColor={this.props.colors.listInputButton}
            multiline={true}
            style={this.props.styles.textInput}
            textInputRef={this.textInputRef}
            ref={this.clearableTextInputRef}
          />
          <Animated.View style={sendButtonContainerStyle}>
            <TouchableOpacity
              onPress={this.onSend}
              activeOpacity={0.4}
              style={this.props.styles.sendButton}
              disabled={trimMessage(this.state.text) === ''}
            >
              <Icon
                name="md-send"
                size={25}
                style={this.props.styles.sendIcon}
                color={this.props.colors.greenButton}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  textInputRef = (textInput: ?React.ElementRef<typeof TextInput>) => {
    this.textInput = textInput;
  };

  clearableTextInputRef = (clearableTextInput: ?ClearableTextInput) => {
    this.clearableTextInput = clearableTextInput;
  };

  updateText = (text: string) => {
    this.setState({ text });
    this.saveDraft(text);
  };

  saveDraft = _throttle((text: string) => {
    this.props.dispatchActionPayload(saveDraftActionType, {
      key: draftKeyFromThreadID(this.props.threadInfo.id),
      draft: text,
    });
  }, 400);

  onSend = async () => {
    if (!trimMessage(this.state.text)) {
      return;
    }
    this.updateSendButton('');

    const { clearableTextInput } = this;
    invariant(
      clearableTextInput,
      'clearableTextInput should be sent in onSend',
    );
    let text = await clearableTextInput.getValueAndReset();
    text = trimMessage(text);
    if (!text) {
      return;
    }

    const localID = `local${this.props.nextLocalID}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, 'should have viewer ID in order to send a message');
    invariant(
      this.props.inputState,
      'inputState should be set in ChatInputBar.onSend',
    );
    this.props.inputState.sendTextMessage({
      type: messageTypes.TEXT,
      localID,
      threadID: this.props.threadInfo.id,
      text,
      creatorID,
      time: Date.now(),
    });
  };

  onPressJoin = () => {
    this.props.dispatchActionPromise(joinThreadActionTypes, this.joinAction());
  };

  async joinAction() {
    const query = this.props.calendarQuery();
    return await this.props.joinThread({
      threadID: this.props.threadInfo.id,
      calendarQuery: {
        startDate: query.startDate,
        endDate: query.endDate,
        filters: [
          ...query.filters,
          { type: 'threads', threadIDs: [this.props.threadInfo.id] },
        ],
      },
    });
  }

  expandButtons = () => {
    if (this.state.buttonsExpanded) {
      return;
    }
    // eslint-disable-next-line import/no-named-as-default-member
    Animated.timing(this.expandoButtonsOpacity, {
      duration: 500,
      toValue: 1,
      easing: Easing.inOut(Easing.ease),
    }).start();
    this.setState({ buttonsExpanded: true });
  };

  hideButtons() {
    if (
      ChatInputBar.mediaGalleryOpen(this.props) ||
      !this.systemKeyboardShowing ||
      !this.state.buttonsExpanded
    ) {
      return;
    }
    // eslint-disable-next-line import/no-named-as-default-member
    Animated.timing(this.expandoButtonsOpacity, {
      duration: 500,
      toValue: 0,
      easing: Easing.inOut(Easing.ease),
    }).start();
    this.setState({ buttonsExpanded: false });
  }

  openCamera = async () => {
    this.dismissKeyboard();
    this.props.navigation.navigate({
      name: CameraModalRouteName,
      params: {
        presentedFrom: this.props.route.key,
        threadID: this.props.threadInfo.id,
      },
    });
  };

  showMediaGallery = () => {
    const { keyboardState } = this.props;
    invariant(keyboardState, 'keyboardState should be initialized');
    keyboardState.showMediaGallery(this.props.threadInfo.id);
  };

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };
}

const styles = {
  cameraIcon: {
    paddingBottom: 10,
    paddingRight: 3,
  },
  cameraRollIcon: {
    paddingBottom: Platform.OS === 'ios' ? 5 : 8,
    paddingRight: 8,
  },
  container: {
    backgroundColor: 'listBackground',
  },
  expandButton: {
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
  expandIcon: {
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
  },
  expandoButtons: {
    alignSelf: 'flex-end',
  },
  explanation: {
    color: 'listBackgroundSecondaryLabel',
    paddingBottom: 4,
    paddingTop: 1,
    textAlign: 'center',
  },
  innerExpandoButtons: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    flexDirection: 'row',
  },
  inputContainer: {
    flexDirection: 'row',
  },
  joinButton: {
    backgroundColor: 'mintButton',
    borderRadius: 5,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
    marginVertical: 3,
    paddingBottom: 5,
    paddingTop: 3,
  },
  joinButtonContainer: {
    flexDirection: 'row',
    height: 36,
  },
  joinButtonText: {
    color: 'listBackground',
    fontSize: 20,
    textAlign: 'center',
  },
  joinThreadLoadingIndicator: {
    paddingVertical: 2,
  },
  sendButton: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 3 : 0,
    left: 0,
  },
  sendIcon: {
    paddingLeft: 9,
    paddingRight: 8,
    paddingVertical: 5,
  },
  textInput: {
    backgroundColor: 'listInputBackground',
    borderRadius: 10,
    color: 'listForegroundLabel',
    fontSize: 16,
    marginLeft: 4,
    marginVertical: 5,
    maxHeight: 250,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
};
const stylesSelector = styleSelector(styles);

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);

export default connectNav((context: ?NavContextType) => ({
  navContext: context,
}))(
  connect(
    (
      state: AppState,
      ownProps: { threadInfo: ThreadInfo, navContext: ?NavContextType },
    ) => {
      const draft = state.drafts[draftKeyFromThreadID(ownProps.threadInfo.id)];
      return {
        viewerID: state.currentUserInfo && state.currentUserInfo.id,
        draft: draft ? draft : '',
        joinThreadLoadingStatus: joinThreadLoadingStatusSelector(state),
        calendarQuery: nonThreadCalendarQuery({
          redux: state,
          navContext: ownProps.navContext,
        }),
        nextLocalID: state.nextLocalID,
        colors: colorsSelector(state),
        styles: stylesSelector(state),
      };
    },
    { joinThread },
  )(withKeyboardState(withInputState(ChatInputBar))),
);
