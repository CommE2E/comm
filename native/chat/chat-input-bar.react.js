// @flow

import invariant from 'invariant';
import _throttle from 'lodash/throttle';
import * as React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Platform,
  Text,
  ActivityIndicator,
  TouchableWithoutFeedback,
  NativeAppEventEmitter,
} from 'react-native';
import { TextInputKeyboardMangerIOS } from 'react-native-keyboard-input';
import Animated, { Easing } from 'react-native-reanimated';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';

import {
  joinThreadActionTypes,
  joinThread,
  newThreadActionTypes,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { localIDPrefix, trimMessage } from 'lib/shared/message-utils';
import {
  threadHasPermission,
  viewerIsMember,
  threadFrozenDueToViewerBlock,
  threadActualMembers,
} from 'lib/shared/thread-utils';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { PhotoPaste } from 'lib/types/media-types';
import { messageTypes } from 'lib/types/message-types';
import type { Dispatch } from 'lib/types/redux-types';
import {
  type ThreadInfo,
  threadPermissions,
  type ClientThreadJoinRequest,
  type ThreadJoinPayload,
} from 'lib/types/thread-types';
import { type UserInfos } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import ClearableTextInput from '../components/clearable-text-input.react';
import { type InputState, InputStateContext } from '../input/input-state';
import { getKeyboardHeight } from '../keyboard/keyboard';
import KeyboardInputHost from '../keyboard/keyboard-input-host.react';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state';
import {
  nonThreadCalendarQuery,
  activeThreadSelector,
} from '../navigation/nav-selectors';
import { NavContext } from '../navigation/navigation-context';
import {
  type NavigationRoute,
  CameraModalRouteName,
  ImagePasteModalRouteName,
} from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { type Colors, useStyles, useColors } from '../themes/colors';
import type { ViewStyle } from '../types/styles';
import { runTiming } from '../utils/animation-utils';
import type { ChatNavigationProp } from './chat.react';

/* eslint-disable import/no-named-as-default-member */
const {
  Value,
  Clock,
  block,
  set,
  cond,
  neq,
  sub,
  interpolate,
  stopClock,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

const expandoButtonsAnimationConfig = {
  duration: 500,
  easing: Easing.inOut(Easing.ease),
};
const sendButtonAnimationConfig = {
  duration: 150,
  easing: Easing.inOut(Easing.ease),
};

const draftKeyFromThreadID = (threadID: string) =>
  `${threadID}/message_composer`;

type BaseProps = {|
  +threadInfo: ThreadInfo,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +viewerID: ?string,
  +draft: string,
  +joinThreadLoadingStatus: LoadingStatus,
  +threadCreationInProgress: boolean,
  +calendarQuery: () => CalendarQuery,
  +nextLocalID: number,
  +userInfos: UserInfos,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // connectNav
  +isActive: boolean,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
  // withInputState
  +inputState: ?InputState,
|};
type State = {|
  +text: string,
  +buttonsExpanded: boolean,
|};
class ChatInputBar extends React.PureComponent<Props, State> {
  textInput: ?React.ElementRef<typeof TextInput>;
  clearableTextInput: ?ClearableTextInput;

  expandoButtonsOpen: Value;
  targetExpandoButtonsOpen: Value;
  expandoButtonsStyle: ViewStyle;
  cameraRollIconStyle: ViewStyle;
  cameraIconStyle: ViewStyle;
  expandIconStyle: ViewStyle;

  sendButtonContainerOpen: Value;
  targetSendButtonContainerOpen: Value;
  sendButtonContainerStyle: ViewStyle;

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.draft,
      buttonsExpanded: true,
    };

    this.expandoButtonsOpen = new Value(1);
    this.targetExpandoButtonsOpen = new Value(1);
    const prevTargetExpandoButtonsOpen = new Value(1);
    const expandoButtonClock = new Clock();
    const expandoButtonsOpen = block([
      cond(neq(this.targetExpandoButtonsOpen, prevTargetExpandoButtonsOpen), [
        stopClock(expandoButtonClock),
        set(prevTargetExpandoButtonsOpen, this.targetExpandoButtonsOpen),
      ]),
      cond(
        neq(this.expandoButtonsOpen, this.targetExpandoButtonsOpen),
        set(
          this.expandoButtonsOpen,
          runTiming(
            expandoButtonClock,
            this.expandoButtonsOpen,
            this.targetExpandoButtonsOpen,
            true,
            expandoButtonsAnimationConfig,
          ),
        ),
      ),
      this.expandoButtonsOpen,
    ]);

    this.cameraRollIconStyle = {
      ...unboundStyles.cameraRollIcon,
      opacity: expandoButtonsOpen,
    };
    this.cameraIconStyle = {
      ...unboundStyles.cameraIcon,
      opacity: expandoButtonsOpen,
    };

    const expandoButtonsWidth = interpolate(expandoButtonsOpen, {
      inputRange: [0, 1],
      outputRange: [22, 60],
    });
    this.expandoButtonsStyle = {
      ...unboundStyles.expandoButtons,
      width: expandoButtonsWidth,
    };

    const expandOpacity = sub(1, expandoButtonsOpen);
    this.expandIconStyle = {
      ...unboundStyles.expandIcon,
      opacity: expandOpacity,
    };

    const initialSendButtonContainerOpen = trimMessage(props.draft) ? 1 : 0;
    this.sendButtonContainerOpen = new Value(initialSendButtonContainerOpen);
    this.targetSendButtonContainerOpen = new Value(
      initialSendButtonContainerOpen,
    );
    const prevTargetSendButtonContainerOpen = new Value(
      initialSendButtonContainerOpen,
    );
    const sendButtonClock = new Clock();
    const sendButtonContainerOpen = block([
      cond(
        neq(
          this.targetSendButtonContainerOpen,
          prevTargetSendButtonContainerOpen,
        ),
        [
          stopClock(sendButtonClock),
          set(
            prevTargetSendButtonContainerOpen,
            this.targetSendButtonContainerOpen,
          ),
        ],
      ),
      cond(
        neq(this.sendButtonContainerOpen, this.targetSendButtonContainerOpen),
        set(
          this.sendButtonContainerOpen,
          runTiming(
            sendButtonClock,
            this.sendButtonContainerOpen,
            this.targetSendButtonContainerOpen,
            true,
            sendButtonAnimationConfig,
          ),
        ),
      ),
      this.sendButtonContainerOpen,
    ]);

    const sendButtonContainerWidth = interpolate(sendButtonContainerOpen, {
      inputRange: [0, 1],
      outputRange: [4, 38],
    });
    this.sendButtonContainerStyle = { width: sendButtonContainerWidth };
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

  immediatelyShowSendButton() {
    this.sendButtonContainerOpen.setValue(1);
    this.targetSendButtonContainerOpen.setValue(1);
  }

  updateSendButton(currentText: string) {
    this.targetSendButtonContainerOpen.setValue(currentText === '' ? 0 : 1);
  }

  componentDidMount() {
    if (this.props.isActive) {
      this.addReplyListener();
    }
  }

  componentWillUnmount() {
    if (this.props.isActive) {
      this.removeReplyListener();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.isActive && !prevProps.isActive) {
      this.addReplyListener();
    } else if (!this.props.isActive && prevProps.isActive) {
      this.removeReplyListener();
    }

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

  addReplyListener() {
    invariant(
      this.props.inputState,
      'inputState should be set in addReplyListener',
    );
    this.props.inputState.addReplyListener(this.focusAndUpdateText);
  }

  removeReplyListener() {
    invariant(
      this.props.inputState,
      'inputState should be set in removeReplyListener',
    );
    this.props.inputState.removeReplyListener(this.focusAndUpdateText);
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

  render() {
    const isMember = viewerIsMember(this.props.threadInfo);
    const canJoin = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.JOIN_THREAD,
    );
    let joinButton = null;
    if (!isMember && canJoin && !this.props.threadCreationInProgress) {
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
    const defaultRoleID = Object.keys(this.props.threadInfo.roles).find(
      (roleID) => this.props.threadInfo.roles[roleID].isDefault,
    );
    invariant(
      defaultRoleID !== undefined,
      'all threads should have a default role',
    );
    const defaultRole = this.props.threadInfo.roles[defaultRoleID];
    const defaultMembersAreVoiced = !!defaultRole.permissions[
      threadPermissions.VOICED
    ];
    // If the thread is created by somebody else while the viewer is attempting to
    // create it, the threadInfo might be modified in-place and won't list the
    // viewer as a member, which will end up hiding the input. In this case, we will
    // assume that our creation action will get translated into a join, and as long
    // as members are voiced, we can show the input.
    if (
      threadHasPermission(this.props.threadInfo, threadPermissions.VOICED) ||
      (this.props.threadCreationInProgress && defaultMembersAreVoiced)
    ) {
      content = this.renderInput();
    } else if (
      threadFrozenDueToViewerBlock(
        this.props.threadInfo,
        this.props.viewerID,
        this.props.userInfos,
      ) &&
      threadActualMembers(this.props.threadInfo.members).length === 2
    ) {
      content = (
        <Text style={this.props.styles.explanation}>
          You can&apos;t send messages to a user that you&apos;ve blocked.
        </Text>
      );
    } else if (isMember) {
      content = (
        <Text style={this.props.styles.explanation}>
          You don&apos;t have permission to send messages.
        </Text>
      );
    } else if (defaultMembersAreVoiced && canJoin) {
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
    const threadColor = `#${this.props.threadInfo.color}`;
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
            allowImagePasteForThreadID={this.props.threadInfo.id}
            value={this.state.text}
            onChangeText={this.updateText}
            placeholder="Send a message..."
            placeholderTextColor={this.props.colors.listInputButton}
            multiline={true}
            style={this.props.styles.textInput}
            textInputRef={this.textInputRef}
            ref={this.clearableTextInputRef}
          />
          <Animated.View style={this.sendButtonContainerStyle}>
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
                color={threadColor}
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

  saveDraft = _throttle((text) => {
    global.CommCoreModule.updateDraft({
      key: draftKeyFromThreadID(this.props.threadInfo.id),
      text,
    });
  }, 400);

  focusAndUpdateText = (text: string) => {
    const currentText = this.state.text;
    if (!currentText.startsWith(text)) {
      const prependedText = text.concat(currentText);
      this.updateText(prependedText);
      this.immediatelyShowSendButton();
      this.immediatelyHideButtons();
    }
    invariant(this.textInput, 'textInput should be set in focusAndUpdateText');
    this.textInput.focus();
  };

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

    const localID = `${localIDPrefix}${this.props.nextLocalID}`;
    const creatorID = this.props.viewerID;
    invariant(creatorID, 'should have viewer ID in order to send a message');
    invariant(
      this.props.inputState,
      'inputState should be set in ChatInputBar.onSend',
    );

    this.props.inputState.sendTextMessage(
      {
        type: messageTypes.TEXT,
        localID,
        threadID: this.props.threadInfo.id,
        text,
        creatorID,
        time: Date.now(),
      },
      this.props.threadInfo,
    );
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
    this.targetExpandoButtonsOpen.setValue(1);
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
    this.targetExpandoButtonsOpen.setValue(0);
    this.setState({ buttonsExpanded: false });
  }

  immediatelyHideButtons() {
    this.expandoButtonsOpen.setValue(0);
    this.targetExpandoButtonsOpen.setValue(0);
    this.setState({ buttonsExpanded: false });
  }

  openCamera = async () => {
    this.dismissKeyboard();
    this.props.navigation.navigate({
      name: CameraModalRouteName,
      params: {
        presentedFrom: this.props.route.key,
        thread: this.props.threadInfo,
      },
    });
  };

  showMediaGallery = () => {
    const { keyboardState } = this.props;
    invariant(keyboardState, 'keyboardState should be initialized');
    keyboardState.showMediaGallery(this.props.threadInfo);
  };

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };
}

const unboundStyles = {
  cameraIcon: {
    paddingBottom: Platform.OS === 'android' ? 11 : 10,
    paddingRight: 3,
  },
  cameraRollIcon: {
    paddingBottom: Platform.OS === 'android' ? 8 : 7,
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
    paddingBottom: Platform.OS === 'android' ? 12 : 10,
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
    bottom: Platform.OS === 'android' ? 4 : 3,
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

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);
const createThreadLoadingStatusSelector = createLoadingStatusSelector(
  newThreadActionTypes,
);

export default React.memo<BaseProps>(function ConnectedChatInputBar(
  props: BaseProps,
) {
  const inputState = React.useContext(InputStateContext);
  const keyboardState = React.useContext(KeyboardContext);
  const navContext = React.useContext(NavContext);

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const isActive = React.useMemo(
    () => props.threadInfo.id === activeThreadSelector(navContext),
    [props.threadInfo.id, navContext],
  );

  const draftKey = draftKeyFromThreadID(props.threadInfo.id);
  const draft = React.useMemo(
    () => global.CommCoreModule.getDraft(draftKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const viewerID = useSelector(
    (state) => state.currentUserInfo && state.currentUserInfo.id,
  );
  const joinThreadLoadingStatus = useSelector(joinThreadLoadingStatusSelector);
  const createThreadLoadingStatus = useSelector(
    createThreadLoadingStatusSelector,
  );
  const threadCreationInProgress = createThreadLoadingStatus === 'loading';
  const calendarQuery = useSelector((state) =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );
  const nextLocalID = useSelector((state) => state.nextLocalID);
  const userInfos = useSelector((state) => state.userStore.userInfos);

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const callJoinThread = useServerCall(joinThread);

  const imagePastedCallback = React.useCallback(
    (imagePastedEvent) => {
      if (props.threadInfo.id !== imagePastedEvent['threadID']) {
        return;
      }
      const pastedImage: PhotoPaste = {
        step: 'photo_paste',
        dimensions: {
          height: imagePastedEvent.height,
          width: imagePastedEvent.width,
        },
        filename: imagePastedEvent.fileName,
        uri: 'file://' + imagePastedEvent.filePath,
        selectTime: 0,
        sendTime: 0,
        retries: 0,
      };
      props.navigation.navigate({
        name: ImagePasteModalRouteName,
        params: {
          imagePasteStagingInfo: pastedImage,
          thread: props.threadInfo,
        },
      });
    },
    [props.navigation, props.threadInfo],
  );

  React.useEffect(() => {
    const imagePasteListener = NativeAppEventEmitter.addListener(
      'imagePasted',
      imagePastedCallback,
    );
    return () => imagePasteListener.remove();
  }, [imagePastedCallback]);

  return (
    <ChatInputBar
      {...props}
      viewerID={viewerID}
      draft={draft}
      joinThreadLoadingStatus={joinThreadLoadingStatus}
      threadCreationInProgress={threadCreationInProgress}
      calendarQuery={calendarQuery}
      nextLocalID={nextLocalID}
      userInfos={userInfos}
      colors={colors}
      styles={styles}
      isActive={isActive}
      keyboardState={keyboardState}
      dispatch={dispatch}
      dispatchActionPromise={dispatchActionPromise}
      joinThread={callJoinThread}
      inputState={inputState}
    />
  );
});
