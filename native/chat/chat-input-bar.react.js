// @flow

import Icon from '@expo/vector-icons/Ionicons.js';
import invariant from 'invariant';
import _throttle from 'lodash/throttle.js';
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
import Animated, { EasingNode } from 'react-native-reanimated';
import { useDispatch } from 'react-redux';

import {
  moveDraftActionType,
  updateDraftActionType,
} from 'lib/actions/draft-actions.js';
import {
  joinThreadActionTypes,
  joinThread,
  newThreadActionTypes,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { userStoreSearchIndex } from 'lib/selectors/user-selectors.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import { useGetEditedMessage } from 'lib/shared/edit-messages-utils.js';
import {
  getTypeaheadUserSuggestions,
  getTypeaheadRegexMatches,
  type Selection,
  getMentionsCandidates,
} from 'lib/shared/mention-utils.js';
import {
  localIDPrefix,
  trimMessage,
  useMessagePreview,
} from 'lib/shared/message-utils.js';
import type { MessagePreviewResult } from 'lib/shared/message-utils.js';
import SearchIndex from 'lib/shared/search-index.js';
import {
  threadHasPermission,
  viewerIsMember,
  threadFrozenDueToViewerBlock,
  threadActualMembers,
  checkIfDefaultMembersAreVoiced,
  draftKeyFromThreadID,
} from 'lib/shared/thread-utils.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { PhotoPaste } from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import {
  type ThreadInfo,
  threadPermissions,
  type ClientThreadJoinRequest,
  type ThreadJoinPayload,
  type RelativeMemberInfo,
} from 'lib/types/thread-types.js';
import { type UserInfos } from 'lib/types/user-types.js';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { ChatContext } from './chat-context.js';
import type { ChatNavigationProp } from './chat.react.js';
import TypeaheadTooltip from './typeahead-tooltip.react.js';
import Button from '../components/button.react.js';
// eslint-disable-next-line import/extensions
import ClearableTextInput from '../components/clearable-text-input.react';
import type { SyncedSelectionData } from '../components/selectable-text-input.js';
// eslint-disable-next-line import/extensions
import SelectableTextInput from '../components/selectable-text-input.react';
import { SingleLine } from '../components/single-line.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import {
  type InputState,
  InputStateContext,
  type EditInputBarMessageParameters,
} from '../input/input-state.js';
import KeyboardInputHost from '../keyboard/keyboard-input-host.react.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state.js';
import { getKeyboardHeight } from '../keyboard/keyboard.js';
import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import {
  nonThreadCalendarQuery,
  activeThreadSelector,
} from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import {
  type NavigationRoute,
  CameraModalRouteName,
  ImagePasteModalRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useStyles, useColors } from '../themes/colors.js';
import type { LayoutEvent } from '../types/react-native.js';
import { type AnimatedViewStyle, AnimatedView } from '../types/styles.js';
import { runTiming } from '../utils/animation-utils.js';
import { nativeTypeaheadRegex } from '../utils/typeahead-utils.js';

/* eslint-disable import/no-named-as-default-member */
const { Value, Clock, block, set, cond, neq, sub, interpolateNode, stopClock } =
  Animated;
/* eslint-enable import/no-named-as-default-member */

const expandoButtonsAnimationConfig = {
  duration: 150,
  easing: EasingNode.inOut(EasingNode.ease),
};
const sendButtonAnimationConfig = {
  duration: 150,
  easing: EasingNode.inOut(EasingNode.ease),
};

type BaseProps = {
  +threadInfo: ThreadInfo,
};
type Props = {
  ...BaseProps,
  +viewerID: ?string,
  +draft: string,
  +joinThreadLoadingStatus: LoadingStatus,
  +threadCreationInProgress: boolean,
  +calendarQuery: () => CalendarQuery,
  +nextLocalID: number,
  +userInfos: UserInfos,
  +colors: Colors,
  +styles: typeof unboundStyles,
  +onInputBarLayout?: (event: LayoutEvent) => mixed,
  +openCamera: () => mixed,
  +isActive: boolean,
  +keyboardState: ?KeyboardState,
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  +joinThread: (request: ClientThreadJoinRequest) => Promise<ThreadJoinPayload>,
  +inputState: ?InputState,
  +userSearchIndex: SearchIndex,
  +mentionsCandidates: $ReadOnlyArray<RelativeMemberInfo>,
  +parentThreadInfo: ?ThreadInfo,
  +messagePreviewResult: ?MessagePreviewResult,
};
type State = {
  +text: string,
  +textEdited: boolean,
  +buttonsExpanded: boolean,
  +selectionState: SyncedSelectionData,
};
class ChatInputBar extends React.PureComponent<Props, State> {
  textInput: ?React.ElementRef<typeof TextInput>;
  clearableTextInput: ?ClearableTextInput;
  selectableTextInput: ?React.ElementRef<typeof SelectableTextInput>;

  expandoButtonsOpen: Value;
  targetExpandoButtonsOpen: Value;
  expandoButtonsStyle: AnimatedViewStyle;
  cameraRollIconStyle: AnimatedViewStyle;
  cameraIconStyle: AnimatedViewStyle;
  expandIconStyle: AnimatedViewStyle;

  sendButtonContainerOpen: Value;
  targetSendButtonContainerOpen: Value;
  sendButtonContainerStyle: AnimatedViewStyle;

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.draft,
      textEdited: false,
      buttonsExpanded: true,
      selectionState: { text: props.draft, selection: { start: 0, end: 0 } },
    };

    this.setUpActionIconAnimations();
    this.setUpSendIconAnimations();
  }

  setUpActionIconAnimations() {
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

    const expandoButtonsWidth = interpolateNode(expandoButtonsOpen, {
      inputRange: [0, 1],
      outputRange: [26, 66],
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
  }

  setUpSendIconAnimations() {
    const initialSendButtonContainerOpen = trimMessage(this.props.draft)
      ? 1
      : 0;
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

    const sendButtonContainerWidth = interpolateNode(sendButtonContainerOpen, {
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
    if (this.shouldShowTextInput) {
      this.targetSendButtonContainerOpen.setValue(currentText === '' ? 0 : 1);
    } else {
      this.setUpSendIconAnimations();
    }
  }

  componentDidMount() {
    if (this.props.isActive) {
      this.addEditInputMessageListener();
    }
  }

  componentWillUnmount() {
    if (this.props.isActive) {
      this.removeEditInputMessageListener();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (
      this.state.textEdited &&
      this.state.text &&
      this.props.threadInfo.id !== prevProps.threadInfo.id
    ) {
      this.props.dispatch({
        type: moveDraftActionType,
        payload: {
          oldKey: draftKeyFromThreadID(prevProps.threadInfo.id),
          newKey: draftKeyFromThreadID(this.props.threadInfo.id),
        },
      });
    } else if (!this.state.textEdited && this.props.draft !== prevProps.draft) {
      this.setState({ text: this.props.draft });
    }
    if (this.props.isActive && !prevProps.isActive) {
      this.addEditInputMessageListener();
    } else if (!this.props.isActive && prevProps.isActive) {
      this.removeEditInputMessageListener();
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
    const systemKeyboardWasShowing =
      ChatInputBar.systemKeyboardShowing(prevProps);
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

  addEditInputMessageListener() {
    invariant(
      this.props.inputState,
      'inputState should be set in addEditInputMessageListener',
    );
    this.props.inputState.addEditInputMessageListener(this.focusAndUpdateText);
  }

  removeEditInputMessageListener() {
    invariant(
      this.props.inputState,
      'inputState should be set in removeEditInputMessageListener',
    );
    this.props.inputState.removeEditInputMessageListener(
      this.focusAndUpdateText,
    );
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

  get shouldShowTextInput(): boolean {
    if (threadHasPermission(this.props.threadInfo, threadPermissions.VOICED)) {
      return true;
    }
    // If the thread is created by somebody else while the viewer is attempting
    // to create it, the threadInfo might be modified in-place
    // and won't list the viewer as a member,
    // which will end up hiding the input.
    // In this case, we will assume that our creation action
    // will get translated into a join, and as long
    // as members are voiced, we can show the input.
    if (!this.props.threadCreationInProgress) {
      return false;
    }
    return checkIfDefaultMembersAreVoiced(this.props.threadInfo);
  }

  render() {
    const isMember = viewerIsMember(this.props.threadInfo);
    const canJoin = threadHasPermission(
      this.props.threadInfo,
      threadPermissions.JOIN_THREAD,
    );
    let joinButton = null;
    const threadColor = `#${this.props.threadInfo.color}`;
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
        const textStyle = colorIsDark(this.props.threadInfo.color)
          ? this.props.styles.joinButtonTextLight
          : this.props.styles.joinButtonTextDark;
        buttonContent = (
          <View style={this.props.styles.joinButtonContent}>
            <SWMansionIcon name="plus" style={textStyle} />
            <Text style={textStyle}>Join Chat</Text>
          </View>
        );
      }
      joinButton = (
        <View style={this.props.styles.joinButtonContainer}>
          <Button
            onPress={this.onPressJoin}
            iosActiveOpacity={0.85}
            style={[
              this.props.styles.joinButton,
              { backgroundColor: threadColor },
            ]}
          >
            {buttonContent}
          </Button>
        </View>
      );
    }

    const typeaheadRegexMatches = getTypeaheadRegexMatches(
      this.state.selectionState.text,
      this.state.selectionState.selection,
      nativeTypeaheadRegex,
    );

    let typeaheadTooltip = null;

    if (typeaheadRegexMatches) {
      const typeaheadMatchedStrings = {
        textBeforeAtSymbol: typeaheadRegexMatches[1] ?? '',
        usernamePrefix: typeaheadRegexMatches[4] ?? '',
      };

      const suggestedUsers = getTypeaheadUserSuggestions(
        this.props.userSearchIndex,
        this.props.mentionsCandidates,
        this.props.viewerID,
        typeaheadMatchedStrings.usernamePrefix,
      );

      if (suggestedUsers.length > 0) {
        typeaheadTooltip = (
          <TypeaheadTooltip
            text={this.state.text}
            matchedStrings={typeaheadMatchedStrings}
            suggestedUsers={suggestedUsers}
            focusAndUpdateTextAndSelection={this.focusAndUpdateTextAndSelection}
          />
        );
      }
    }

    let content;
    const defaultMembersAreVoiced = checkIfDefaultMembersAreVoiced(
      this.props.threadInfo,
    );
    if (this.shouldShowTextInput) {
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
      content = null;
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

    let editMode;
    const isEditMode = this.isEditMode();
    if (isEditMode && this.props.messagePreviewResult) {
      const { message } = this.props.messagePreviewResult;
      editMode = (
        <>
          <AnimatedView style={this.props.styles.editView}>
            <View style={this.props.styles.editViewContent}>
              <Text
                style={[{ color: threadColor }, this.props.styles.editingLabel]}
              >
                Editing message
              </Text>
              <SingleLine style={this.props.styles.editingMessagePreview}>
                {message.text}
              </SingleLine>
            </View>
            <SWMansionIcon
              style={this.props.styles.exitEditButton}
              name="cross"
              size={22}
              color={threadColor}
              onPress={this.onPressExitEditMode}
            />
          </AnimatedView>
        </>
      );
    }

    return (
      <View
        style={this.props.styles.container}
        onLayout={this.props.onInputBarLayout}
      >
        {typeaheadTooltip}
        {joinButton}
        {editMode}
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
        <AnimatedView style={this.expandIconStyle}>
          <SWMansionIcon
            name="chevron-right"
            size={22}
            color={`#${this.props.threadInfo.color}`}
          />
        </AnimatedView>
      </TouchableOpacity>
    );
    const threadColor = `#${this.props.threadInfo.color}`;
    return (
      <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
        <View style={this.props.styles.inputContainer}>
          <AnimatedView style={this.expandoButtonsStyle}>
            <View style={this.props.styles.innerExpandoButtons}>
              {this.state.buttonsExpanded ? expandoButton : null}
              <TouchableOpacity
                onPress={this.showMediaGallery}
                activeOpacity={0.4}
              >
                <AnimatedView style={this.cameraRollIconStyle}>
                  <SWMansionIcon
                    name="image-1"
                    size={28}
                    color={`#${this.props.threadInfo.color}`}
                  />
                </AnimatedView>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={this.props.openCamera}
                activeOpacity={0.4}
                disabled={!this.state.buttonsExpanded}
              >
                <AnimatedView style={this.cameraIconStyle}>
                  <SWMansionIcon
                    name="camera"
                    size={28}
                    color={`#${this.props.threadInfo.color}`}
                  />
                </AnimatedView>
              </TouchableOpacity>
              {this.state.buttonsExpanded ? null : expandoButton}
            </View>
          </AnimatedView>
          <SelectableTextInput
            allowImagePasteForThreadID={this.props.threadInfo.id}
            value={this.state.text}
            onChangeText={this.updateText}
            selection={this.state.selectionState.selection}
            onUpdateSyncedSelectionData={this.updateSelectionState}
            placeholder="Send a message..."
            placeholderTextColor={this.props.colors.listInputButton}
            multiline={true}
            style={this.props.styles.textInput}
            textInputRef={this.textInputRef}
            clearableTextInputRef={this.clearableTextInputRef}
            ref={this.selectableTextInputRef}
            selectionColor={`#${this.props.threadInfo.color}`}
          />
          <AnimatedView style={this.sendButtonContainerStyle}>
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
          </AnimatedView>
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

  selectableTextInputRef = (
    selectableTextInput: ?React.ElementRef<typeof SelectableTextInput>,
  ) => {
    this.selectableTextInput = selectableTextInput;
  };

  updateText = (text: string) => {
    this.setState({ text, textEdited: true });
    this.saveDraft(text);
  };

  updateSelectionState: (data: SyncedSelectionData) => void = data => {
    this.setState({ selectionState: data });
  };

  saveDraft = _throttle(text => {
    this.props.dispatch({
      type: updateDraftActionType,
      payload: {
        key: draftKeyFromThreadID(this.props.threadInfo.id),
        text,
      },
    });
  }, 400);

  focusAndUpdateTextAndSelection = (text: string, selection: Selection) => {
    this.selectableTextInput?.prepareForSelectionMutation(text, selection);
    this.setState({
      text,
      textEdited: true,
      selectionState: { text, selection },
    });
    this.saveDraft(text);

    this.focusAndUpdateButtonsVisibility();
  };

  focusAndUpdateText = (params: EditInputBarMessageParameters) => {
    const { message: text, mode } = params;
    const currentText = this.state.text;
    if (mode === 'replace') {
      this.updateText(text);
    } else if (!currentText.startsWith(text)) {
      const prependedText = text.concat(currentText);
      this.updateText(prependedText);
    }

    this.focusAndUpdateButtonsVisibility();
  };

  focusAndUpdateButtonsVisibility = () => {
    const { textInput } = this;
    if (!textInput) {
      return;
    }

    this.immediatelyShowSendButton();
    this.immediatelyHideButtons();
    textInput.focus();
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
      this.props.parentThreadInfo,
    );
  };

  editState = () => this.props.inputState?.editState;

  isEditMode = () => {
    const editState = this.editState();
    return editState && editState.editedMessageID !== null;
  };

  onPressExitEditMode = () => {
    this.props.inputState?.setEditedMessageID(null);
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
    paddingBottom: Platform.OS === 'android' ? 11 : 8,
    paddingRight: 5,
  },
  cameraRollIcon: {
    paddingBottom: Platform.OS === 'android' ? 11 : 8,
    paddingRight: 5,
  },
  container: {
    backgroundColor: 'listBackground',
    paddingLeft: Platform.OS === 'android' ? 10 : 5,
  },
  expandButton: {
    bottom: 0,
    position: 'absolute',
    right: 0,
  },
  expandIcon: {
    paddingBottom: Platform.OS === 'android' ? 13 : 11,
    paddingRight: 2,
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
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
    marginVertical: 3,
  },
  joinButtonContainer: {
    flexDirection: 'row',
    height: 48,
    marginBottom: 8,
  },
  editView: {
    marginLeft: 20,
    marginRight: 20,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editViewContent: {
    flex: 1,
    paddingRight: 6,
  },
  exitEditButton: {
    marginTop: 6,
  },
  editingLabel: {
    paddingBottom: 4,
  },
  editingMessagePreview: {
    color: 'listForegroundLabel',
  },
  joinButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonTextLight: {
    color: 'white',
    fontSize: 20,
    marginHorizontal: 4,
  },
  joinButtonTextDark: {
    color: 'black',
    fontSize: 20,
    marginHorizontal: 4,
  },
  joinThreadLoadingIndicator: {
    paddingVertical: 2,
  },
  sendButton: {
    position: 'absolute',
    bottom: 4,
    left: 0,
  },
  sendIcon: {
    paddingLeft: 9,
    paddingRight: 8,
    paddingVertical: 6,
  },
  textInput: {
    backgroundColor: 'listInputBackground',
    borderRadius: 12,
    color: 'listForegroundLabel',
    fontSize: 16,
    marginLeft: 4,
    marginRight: 4,
    marginTop: 6,
    marginBottom: 8,
    maxHeight: 110,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
};

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);
const createThreadLoadingStatusSelector =
  createLoadingStatusSelector(newThreadActionTypes);

type ConnectedChatInputBarBaseProps = {
  ...BaseProps,
  +onInputBarLayout?: (event: LayoutEvent) => mixed,
  +openCamera: () => mixed,
};
function ConnectedChatInputBarBase(props: ConnectedChatInputBarBaseProps) {
  const navContext = React.useContext(NavContext);
  const keyboardState = React.useContext(KeyboardContext);
  const inputState = React.useContext(InputStateContext);

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const draft = useSelector(
    state =>
      state.draftStore.drafts[draftKeyFromThreadID(props.threadInfo.id)] ?? '',
  );
  const joinThreadLoadingStatus = useSelector(joinThreadLoadingStatusSelector);
  const createThreadLoadingStatus = useSelector(
    createThreadLoadingStatusSelector,
  );
  const threadCreationInProgress = createThreadLoadingStatus === 'loading';
  const calendarQuery = useSelector(state =>
    nonThreadCalendarQuery({
      redux: state,
      navContext,
    }),
  );
  const nextLocalID = useSelector(state => state.nextLocalID);
  const userInfos = useSelector(state => state.userStore.userInfos);

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const isActive = React.useMemo(
    () => props.threadInfo.id === activeThreadSelector(navContext),
    [props.threadInfo.id, navContext],
  );

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const callJoinThread = useServerCall(joinThread);

  const userSearchIndex = useSelector(userStoreSearchIndex);

  const { parentThreadID } = props.threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );

  const mentionsCandidates = getMentionsCandidates(
    props.threadInfo,
    parentThreadInfo,
  );

  const editedMessageID = inputState?.editState.editedMessageID;
  const editedMessageInfo = useSelector(useGetEditedMessage(editedMessageID));

  const messagePreviewResult = useMessagePreview(
    editedMessageInfo,
    props.threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );

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
      userSearchIndex={userSearchIndex}
      mentionsCandidates={mentionsCandidates}
      parentThreadInfo={parentThreadInfo}
      messagePreviewResult={messagePreviewResult}
    />
  );
}

type DummyChatInputBarProps = {
  ...BaseProps,
  +onHeightMeasured: (height: number) => mixed,
};
const noop = () => {};
function DummyChatInputBar(props: DummyChatInputBarProps): React.Node {
  const { onHeightMeasured, ...restProps } = props;
  const onInputBarLayout = React.useCallback(
    (event: LayoutEvent) => {
      const { height } = event.nativeEvent.layout;
      onHeightMeasured(height);
    },
    [onHeightMeasured],
  );
  return (
    <View pointerEvents="none">
      <ConnectedChatInputBarBase
        {...restProps}
        onInputBarLayout={onInputBarLayout}
        openCamera={noop}
      />
    </View>
  );
}

type ChatInputBarProps = {
  ...BaseProps,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
};
const ConnectedChatInputBar: React.ComponentType<ChatInputBarProps> =
  React.memo<ChatInputBarProps>(function ConnectedChatInputBar(
    props: ChatInputBarProps,
  ) {
    const { navigation, route, ...restProps } = props;
    const keyboardState = React.useContext(KeyboardContext);

    const { threadInfo } = props;
    const imagePastedCallback = React.useCallback(
      imagePastedEvent => {
        if (threadInfo.id !== imagePastedEvent.threadID) {
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
        navigation.navigate<'ImagePasteModal'>({
          name: ImagePasteModalRouteName,
          params: {
            imagePasteStagingInfo: pastedImage,
            thread: threadInfo,
          },
        });
      },
      [navigation, threadInfo],
    );

    React.useEffect(() => {
      const imagePasteListener = NativeAppEventEmitter.addListener(
        'imagePasted',
        imagePastedCallback,
      );
      return () => imagePasteListener.remove();
    }, [imagePastedCallback]);

    const chatContext = React.useContext(ChatContext);
    invariant(chatContext, 'should be set');
    const { setChatInputBarHeight, deleteChatInputBarHeight } = chatContext;
    const onInputBarLayout = React.useCallback(
      (event: LayoutEvent) => {
        const { height } = event.nativeEvent.layout;
        setChatInputBarHeight(threadInfo.id, height);
      },
      [threadInfo.id, setChatInputBarHeight],
    );

    React.useEffect(() => {
      return () => {
        deleteChatInputBarHeight(threadInfo.id);
      };
    }, [deleteChatInputBarHeight, threadInfo.id]);

    const openCamera = React.useCallback(() => {
      keyboardState?.dismissKeyboard();
      navigation.navigate<'CameraModal'>({
        name: CameraModalRouteName,
        params: {
          presentedFrom: route.key,
          thread: threadInfo,
        },
      });
    }, [keyboardState, navigation, route.key, threadInfo]);

    return (
      <ConnectedChatInputBarBase
        {...restProps}
        onInputBarLayout={onInputBarLayout}
        openCamera={openCamera}
      />
    );
  });

export { ConnectedChatInputBar as ChatInputBar, DummyChatInputBar };
