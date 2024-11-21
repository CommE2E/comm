// @flow

import Icon from '@expo/vector-icons/Ionicons.js';
import type { GenericNavigationAction } from '@react-navigation/core';
import invariant from 'invariant';
import _throttle from 'lodash/throttle.js';
import * as React from 'react';
import {
  ActivityIndicator,
  NativeAppEventEmitter,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { TextInputKeyboardMangerIOS } from 'react-native-keyboard-input';
import Animated, {
  EasingNode,
  FadeInDown,
  FadeOutDown,
} from 'react-native-reanimated';

import {
  moveDraftActionType,
  updateDraftActionType,
} from 'lib/actions/draft-actions.js';
import {
  joinThreadActionTypes,
  newThreadActionTypes,
  useJoinThread,
} from 'lib/actions/thread-actions.js';
import type { UseJoinThreadInput } from 'lib/actions/thread-actions.js';
import {
  useChatMentionContext,
  useThreadChatMentionCandidates,
} from 'lib/hooks/chat-mention-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import { useEditMessage } from 'lib/shared/edit-messages-utils.js';
import {
  getTypeaheadRegexMatches,
  type MentionTypeaheadSuggestionItem,
  type Selection,
  type TypeaheadMatchedStrings,
  useMentionTypeaheadChatSuggestions,
  useMentionTypeaheadUserSuggestions,
  useUserMentionsCandidates,
} from 'lib/shared/mention-utils.js';
import {
  messageKey,
  type MessagePreviewResult,
  trimMessage,
  useMessagePreview,
  getNextLocalID,
} from 'lib/shared/message-utils.js';
import SentencePrefixSearchIndex from 'lib/shared/sentence-prefix-search-index.js';
import {
  checkIfDefaultMembersAreVoiced,
  draftKeyFromThreadID,
  threadActualMembers,
  useThreadFrozenDueToViewerBlock,
  useThreadHasPermission,
  viewerIsMember,
} from 'lib/shared/thread-utils.js';
import type { CalendarQuery } from 'lib/types/entry-types.js';
import type { SetState } from 'lib/types/hook-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { PhotoPaste } from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { MessageInfo } from 'lib/types/message-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
  RawThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type {
  ChatMentionCandidates,
  ThreadJoinPayload,
} from 'lib/types/thread-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { ChatContext } from './chat-context.js';
import type { ChatNavigationProp } from './chat.react.js';
import {
  MessageEditingContext,
  type MessageEditingContextType,
} from './message-editing-context.react.js';
import type { RemoveEditMode } from './message-list-types.js';
import TypeaheadTooltip from './typeahead-tooltip.react.js';
import MentionTypeaheadTooltipButton from '../chat/mention-typeahead-tooltip-button.react.js';
import Button from '../components/button.react.js';
// eslint-disable-next-line import/extensions
import ClearableTextInput from '../components/clearable-text-input.react';
import type { SyncedSelectionData } from '../components/selectable-text-input.js';
// eslint-disable-next-line import/extensions
import SelectableTextInput from '../components/selectable-text-input.react';
import SingleLine from '../components/single-line.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import {
  type EditInputBarMessageParameters,
  type InputState,
  InputStateContext,
} from '../input/input-state.js';
import KeyboardInputHost from '../keyboard/keyboard-input-host.react.js';
import {
  KeyboardContext,
  type KeyboardState,
} from '../keyboard/keyboard-state.js';
import { getKeyboardHeight } from '../keyboard/keyboard.js';
import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import {
  activeThreadSelector,
  nonThreadCalendarQuery,
} from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import type { OverlayContextType } from '../navigation/overlay-context.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import {
  ChatCameraModalRouteName,
  ImagePasteModalRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import type { ImagePasteEvent, LayoutEvent } from '../types/react-native.js';
import {
  AnimatedView,
  type AnimatedViewStyle,
  type ViewStyle,
} from '../types/styles.js';
import Alert from '../utils/alert.js';
import { runTiming } from '../utils/animation-utils.js';
import { exitEditAlert } from '../utils/edit-messages-utils.js';
import {
  mentionTypeaheadTooltipActions,
  nativeMentionTypeaheadRegex,
} from '../utils/typeahead-utils.js';

const {
  Value,
  Clock,
  block,
  set,
  cond,
  neq,
  sub,
  interpolateNode,
  stopClock,
  useValue,
} = Animated;

const expandoButtonsAnimationConfig = {
  duration: 150,
  easing: EasingNode.inOut(EasingNode.ease),
};
const sendButtonAnimationConfig = {
  duration: 150,
  easing: EasingNode.inOut(EasingNode.ease),
};

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
    borderRadius: 8,
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

type BaseProps = {
  +threadInfo: ThreadInfo,
};
type Props = {
  ...BaseProps,
  +viewerID: ?string,
  +rawThreadInfo: RawThreadInfo,
  +draft: string,
  +joinThreadLoadingStatus: LoadingStatus,
  +threadCreationInProgress: boolean,
  +calendarQuery: () => CalendarQuery,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  +onInputBarLayout?: (event: LayoutEvent) => mixed,
  +openCamera: () => mixed,
  +isActive: boolean,
  +keyboardState: ?KeyboardState,
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  +joinThread: (input: UseJoinThreadInput) => Promise<ThreadJoinPayload>,
  +inputState: ?InputState,
  +userMentionsCandidates: $ReadOnlyArray<RelativeMemberInfo>,
  +chatMentionSearchIndex: ?SentencePrefixSearchIndex,
  +chatMentionCandidates: ChatMentionCandidates,
  +parentThreadInfo: ?ThreadInfo,
  +editedMessagePreview: ?MessagePreviewResult,
  +editedMessageInfo: ?MessageInfo,
  +editMessage: (messageID: string, text: string) => Promise<void>,
  +navigation: ?ChatNavigationProp<'MessageList'>,
  +overlayContext: ?OverlayContextType,
  +messageEditingContext: ?MessageEditingContextType,
  +selectionState: SyncedSelectionData,
  +setSelectionState: SetState<SyncedSelectionData>,
  +suggestions: $ReadOnlyArray<MentionTypeaheadSuggestionItem>,
  +typeaheadMatchedStrings: ?TypeaheadMatchedStrings,
  +currentUserIsVoiced: boolean,
  +currentUserCanJoin: boolean,
  +threadFrozen: boolean,
  +text: string,
  +setText: (text: string) => void,
  +textEdited: boolean,
  +setTextEdited: (edited: boolean) => void,
  +buttonsExpanded: boolean,
  +isExitingDuringEditModeRef: { current: boolean },
  +expandoButtonsStyle: AnimatedViewStyle,
  +cameraRollIconStyle: AnimatedViewStyle,
  +cameraIconStyle: AnimatedViewStyle,
  +expandIconStyle: AnimatedViewStyle,
  +sendButtonContainerStyle: AnimatedViewStyle,
  +shouldShowTextInput: () => boolean,
  +isEditMode: () => boolean,
  +immediatelyShowSendButton: () => void,
  +updateSendButton: (currentText: string) => void,
  +expandButtons: () => void,
  +hideButtons: () => void,
  +immediatelyHideButtons: () => void,
  +textInputRef: { current: ?React.ElementRef<typeof TextInput> },
  +clearableTextInputRef: { current: ?ClearableTextInput },
  +selectableTextInputRef: {
    current: ?React.ElementRef<typeof SelectableTextInput>,
  },
  +setTextInputRef: (ref: ?React.ElementRef<typeof TextInput>) => void,
  +setClearableTextInputRef: (ref: ?ClearableTextInput) => void,
};

class ChatInputBar extends React.PureComponent<Props> {
  clearBeforeRemoveListener: () => void;
  clearFocusListener: () => void;
  clearBlurListener: () => void;

  static mediaGalleryOpen(props: Props): boolean {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.mediaGalleryOpen);
  }

  static systemKeyboardShowing(props: Props): boolean {
    const { keyboardState } = props;
    return !!(keyboardState && keyboardState.systemKeyboardShowing);
  }

  get systemKeyboardShowing(): boolean {
    return ChatInputBar.systemKeyboardShowing(this.props);
  }

  immediatelyShowSendButton() {
    this.props.sendButtonContainerOpen.setValue(1);
    this.props.targetSendButtonContainerOpen.setValue(1);
  }

  updateSendButton(currentText: string) {
    const targetValue = currentText === '' ? 0 : 1;
    this.props.targetSendButtonContainerOpen.setValue(targetValue);
    if (!this.shouldShowTextInput) {
      this.props.sendButtonContainerOpen.setValue(targetValue);
    }
  }

  componentDidMount() {
    const { isActive, navigation } = this.props;
    if (isActive) {
      this.addEditInputMessageListener();
    }
    if (!navigation) {
      return;
    }
    this.clearBeforeRemoveListener = navigation.addListener(
      'beforeRemove',
      this.onNavigationBeforeRemove,
    );
    this.clearFocusListener = navigation.addListener(
      'focus',
      this.onNavigationFocus,
    );
    this.clearBlurListener = navigation.addListener(
      'blur',
      this.onNavigationBlur,
    );
  }

  componentWillUnmount() {
    if (this.props.isActive) {
      this.removeEditInputMessageListener();
    }
    if (this.clearBeforeRemoveListener) {
      this.clearBeforeRemoveListener();
    }
    if (this.clearFocusListener) {
      this.clearFocusListener();
    }
    if (this.clearBlurListener) {
      this.clearBlurListener();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.props.textEdited &&
      this.props.text &&
      this.props.threadInfo.id !== prevProps.threadInfo.id
    ) {
      this.props.dispatch({
        type: moveDraftActionType,
        payload: {
          oldKey: draftKeyFromThreadID(prevProps.threadInfo.id),
          newKey: draftKeyFromThreadID(this.props.threadInfo.id),
        },
      });
    } else if (!this.props.textEdited && this.props.draft !== prevProps.draft) {
      this.props.setText(this.props.draft);
    }
    if (this.props.isActive && !prevProps.isActive) {
      this.addEditInputMessageListener();
    } else if (!this.props.isActive && prevProps.isActive) {
      this.removeEditInputMessageListener();
    }

    const currentText = trimMessage(this.props.text);
    const prevText = trimMessage(prevProps.text);

    if (
      (currentText === '' && prevText !== '') ||
      (currentText !== '' && prevText === '')
    ) {
      this.props.updateSendButton(currentText);
    }

    const systemKeyboardIsShowing = ChatInputBar.systemKeyboardShowing(
      this.props,
    );
    const systemKeyboardWasShowing =
      ChatInputBar.systemKeyboardShowing(prevProps);
    if (systemKeyboardIsShowing && !systemKeyboardWasShowing) {
      this.props.hideButtons();
    } else if (!systemKeyboardIsShowing && systemKeyboardWasShowing) {
      this.props.expandButtons();
    }

    const imageGalleryIsOpen = ChatInputBar.mediaGalleryOpen(this.props);
    const imageGalleryWasOpen = ChatInputBar.mediaGalleryOpen(prevProps);
    if (!imageGalleryIsOpen && imageGalleryWasOpen) {
      this.props.hideButtons();
    } else if (imageGalleryIsOpen && !imageGalleryWasOpen) {
      this.props.expandButtons();
      this.setIOSKeyboardHeight();
    }

    if (
      this.props.messageEditingContext?.editState.editedMessage &&
      !prevProps.messageEditingContext?.editState.editedMessage
    ) {
      this.blockNavigation();
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
    const textInput = this.props.textInputRef.current;
    if (!textInput) {
      return;
    }
    const keyboardHeight = getKeyboardHeight();
    if (keyboardHeight === null || keyboardHeight === undefined) {
      return;
    }
    TextInputKeyboardMangerIOS.setKeyboardHeight(textInput, keyboardHeight);
  }

  render(): React.Node {
    const isMember = viewerIsMember(this.props.threadInfo);
    let joinButton = null;
    const threadColor = `#${this.props.threadInfo.color}`;
    const isEditMode = this.props.isEditMode();
    if (
      !isMember &&
      this.props.currentUserCanJoin &&
      !this.props.threadCreationInProgress
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

    let typeaheadTooltip = null;

    if (
      this.props.suggestions.length > 0 &&
      this.props.typeaheadMatchedStrings &&
      !isEditMode
    ) {
      typeaheadTooltip = (
        <TypeaheadTooltip
          text={this.props.text}
          matchedStrings={this.props.typeaheadMatchedStrings}
          suggestions={this.props.suggestions}
          focusAndUpdateTextAndSelection={this.focusAndUpdateTextAndSelection}
          typeaheadTooltipActionsGetter={mentionTypeaheadTooltipActions}
          TypeaheadTooltipButtonComponent={MentionTypeaheadTooltipButton}
        />
      );
    }

    let content;
    const defaultMembersAreVoiced = checkIfDefaultMembersAreVoiced(
      this.props.threadInfo,
    );
    if (this.props.shouldShowTextInput()) {
      content = this.renderInput();
    } else if (
      this.props.threadFrozen &&
      threadActualMembers(this.props.threadInfo.members).length === 2
    ) {
      content = (
        <Text style={this.props.styles.explanation}>
          You can&rsquo;t send messages to a user that you&rsquo;ve blocked.
        </Text>
      );
    } else if (isMember) {
      content = (
        <Text style={this.props.styles.explanation}>
          You don&rsquo;t have permission to send messages.
        </Text>
      );
    } else if (defaultMembersAreVoiced && this.props.currentUserCanJoin) {
      content = null;
    } else {
      content = (
        <Text style={this.props.styles.explanation}>
          You don&rsquo;t have permission to send messages.
        </Text>
      );
    }

    const keyboardInputHost =
      Platform.OS === 'android' ? null : (
        <KeyboardInputHost textInputRef={this.props.textInputRef.current} />
      );

    let editedMessage;
    if (isEditMode && this.props.editedMessagePreview) {
      const { message } = this.props.editedMessagePreview;
      editedMessage = (
        <AnimatedView
          style={this.props.styles.editView}
          entering={FadeInDown}
          exiting={FadeOutDown}
        >
          <View style={this.props.styles.editViewContent}>
            <TouchableOpacity
              onPress={this.scrollToEditedMessage}
              activeOpacity={0.4}
            >
              <Text
                style={[{ color: threadColor }, this.props.styles.editingLabel]}
              >
                Editing message
              </Text>
              <SingleLine style={this.props.styles.editingMessagePreview}>
                {message.text}
              </SingleLine>
            </TouchableOpacity>
          </View>
          <SWMansionIcon
            style={this.props.styles.exitEditButton}
            name="cross"
            size={22}
            color={threadColor}
            onPress={this.onPressExitEditMode}
          />
        </AnimatedView>
      );
    }

    return (
      <AnimatedView
        style={this.props.styles.container}
        onLayout={this.props.onInputBarLayout}
      >
        {typeaheadTooltip}
        {joinButton}
        {editedMessage}
        {content}
        {keyboardInputHost}
      </AnimatedView>
    );
  }

  renderInput(): React.Node {
    const expandoButton = (
      <TouchableOpacity
        onPress={this.props.expandButtons}
        activeOpacity={0.4}
        style={this.props.styles.expandButton}
      >
        <AnimatedView style={this.props.expandIconStyle}>
          <SWMansionIcon
            name="chevron-right"
            size={22}
            color={`#${this.props.threadInfo.color}`}
          />
        </AnimatedView>
      </TouchableOpacity>
    );
    const threadColor = `#${this.props.threadInfo.color}`;
    const expandoButtonsViewStyle: Array<ViewStyle> = [
      this.props.styles.innerExpandoButtons,
    ];
    if (this.props.isEditMode()) {
      expandoButtonsViewStyle.push({ display: 'none' });
    }
    return (
      <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
        <View style={this.props.styles.inputContainer}>
          <AnimatedView style={this.props.expandoButtonsStyle}>
            <View style={expandoButtonsViewStyle}>
              {this.props.buttonsExpanded ? expandoButton : null}
              <TouchableOpacity
                onPress={this.showMediaGallery}
                activeOpacity={0.4}
              >
                <AnimatedView style={this.props.cameraRollIconStyle}>
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
                disabled={!this.props.buttonsExpanded}
              >
                <AnimatedView style={this.props.cameraIconStyle}>
                  <SWMansionIcon
                    name="camera"
                    size={28}
                    color={`#${this.props.threadInfo.color}`}
                  />
                </AnimatedView>
              </TouchableOpacity>
              {this.props.buttonsExpanded ? null : expandoButton}
            </View>
          </AnimatedView>
          <SelectableTextInput
            allowImagePasteForThreadID={this.props.threadInfo.id}
            value={this.props.text}
            onChangeText={this.updateText}
            selection={this.props.selectionState.selection}
            onUpdateSyncedSelectionData={this.props.setSelectionState}
            placeholder="Send a message..."
            placeholderTextColor={this.props.colors.listInputButton}
            multiline={true}
            style={this.props.styles.textInput}
            textInputRef={this.props.setTextInputRef}
            clearableTextInputRef={this.props.setClearableTextInputRef}
            ref={this.props.selectableTextInputRef}
            selectionColor={`#${this.props.threadInfo.color}`}
          />
          <AnimatedView style={this.props.sendButtonContainerStyle}>
            <TouchableOpacity
              onPress={this.onSend}
              activeOpacity={0.4}
              style={this.props.styles.sendButton}
              disabled={trimMessage(this.props.text) === ''}
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

  updateText = (text: string) => {
    if (this.props.isExitingDuringEditModeRef.current) {
      return;
    }
    this.props.setText(text);
    this.props.setTextEdited(true);
    this.props.messageEditingContext?.setEditedMessageChanged(
      this.isMessageEdited(text),
    );
    if (this.props.isEditMode()) {
      return;
    }
    this.saveDraft(text);
  };

  saveDraft: (text: string) => void = _throttle(text => {
    this.props.dispatch({
      type: updateDraftActionType,
      payload: {
        key: draftKeyFromThreadID(this.props.threadInfo.id),
        text,
      },
    });
  }, 400);

  focusAndUpdateTextAndSelection = (text: string, selection: Selection) => {
    this.props.selectableTextInputRef.current?.prepareForSelectionMutation(
      text,
      selection,
    );
    this.props.setText(text);
    this.props.setTextEdited(true);
    this.props.setSelectionState({ text, selection });
    this.saveDraft(text);

    this.focusAndUpdateButtonsVisibility();
  };

  focusAndUpdateText = (params: EditInputBarMessageParameters) => {
    const { message: text, mode } = params;
    const currentText = this.props.text;
    if (mode === 'replace') {
      this.updateText(text);
    } else if (!currentText.startsWith(text)) {
      const prependedText = text.concat(currentText);
      this.updateText(prependedText);
    }

    this.focusAndUpdateButtonsVisibility();
  };

  focusAndUpdateButtonsVisibility = () => {
    const textInput = this.props.textInputRef.current;

    if (!textInput) {
      return;
    }

    this.props.immediatelyShowSendButton();
    this.props.immediatelyHideButtons();
    textInput.focus();
  };

  onSend = async () => {
    if (!trimMessage(this.props.text)) {
      return;
    }

    const editedMessage = this.getEditedMessage();
    if (editedMessage && editedMessage.id) {
      await this.editMessage(editedMessage.id, this.props.text);
      return;
    }

    this.props.updateSendButton('');

    const clearableTextInput = this.props.clearableTextInputRef.current;
    invariant(
      clearableTextInput,
      'clearableTextInput should be sent in onSend',
    );
    let text = await clearableTextInput.getValueAndReset();
    text = trimMessage(text);
    if (!text) {
      return;
    }

    const localID = getNextLocalID();
    const creatorID = this.props.viewerID;
    invariant(creatorID, 'should have viewer ID in order to send a message');
    invariant(
      this.props.inputState,
      'inputState should be set in ChatInputBar.onSend',
    );

    await this.props.inputState.sendTextMessage(
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

  isMessageEdited = (newText?: string): boolean => {
    let text = newText ?? this.props.text;
    text = trimMessage(text);
    const originalText = this.props.editedMessageInfo?.text;
    return text !== originalText;
  };

  unblockNavigation = () => {
    const { navigation } = this.props;
    if (!navigation) {
      return;
    }
    navigation.setParams({ removeEditMode: null });
  };

  removeEditMode: RemoveEditMode = action => {
    const { navigation } = this.props;
    if (!navigation || this.props.isExitingDuringEditModeRef.current) {
      return 'ignore_action';
    }
    if (!this.isMessageEdited()) {
      this.unblockNavigation();
      return 'reduce_action';
    }
    const unblockAndDispatch = () => {
      this.unblockNavigation();
      navigation.dispatch(action);
    };
    const onContinueEditing = () => {
      this.props.overlayContext?.resetScrollBlockingModalStatus();
    };
    exitEditAlert({
      onDiscard: unblockAndDispatch,
      onContinueEditing,
    });
    return 'ignore_action';
  };

  blockNavigation = () => {
    const { navigation } = this.props;
    if (!navigation || !navigation.isFocused()) {
      return;
    }
    navigation.setParams({
      removeEditMode: this.removeEditMode,
    });
  };

  editMessage = async (messageID: string, text: string) => {
    if (!this.isMessageEdited()) {
      this.exitEditMode();
      return;
    }
    text = trimMessage(text);
    try {
      await this.props.editMessage(messageID, text);
      this.exitEditMode();
    } catch (error) {
      Alert.alert(
        'Couldn’t edit the message',
        'Please try again later',
        [{ text: 'OK' }],
        {
          cancelable: true,
        },
      );
    }
  };

  getEditedMessage = (): ?MessageInfo => {
    const editState = this.props.messageEditingContext?.editState;
    return editState?.editedMessage;
  };

  onPressExitEditMode = () => {
    if (!this.isMessageEdited()) {
      this.exitEditMode();
      return;
    }
    exitEditAlert({
      onDiscard: this.exitEditMode,
    });
  };

  scrollToEditedMessage = () => {
    const editedMessage = this.getEditedMessage();
    if (!editedMessage) {
      return;
    }
    const editedMessageKey = messageKey(editedMessage);
    this.props.inputState?.scrollToMessage(editedMessageKey);
  };

  exitEditMode = () => {
    this.props.messageEditingContext?.setEditedMessage(null, () => {
      this.unblockNavigation();
      this.updateText(this.props.draft);
      this.focusAndUpdateButtonsVisibility();
      this.props.updateSendButton(this.props.draft);
    });
  };

  onNavigationFocus = () => {
    this.props.isExitingDuringEditModeRef.current = false;
  };

  onNavigationBlur = () => {
    if (!this.props.isEditMode()) {
      return;
    }
    this.props.setText(this.props.draft);
    this.props.isExitingDuringEditModeRef.current = true;
    this.exitEditMode();
  };

  onNavigationBeforeRemove = (e: {
    +data: { +action: GenericNavigationAction },
    +preventDefault: () => void,
    ...
  }) => {
    if (!this.props.isEditMode()) {
      return;
    }
    const { action } = e.data;
    e.preventDefault();
    const saveExit = () => {
      this.props.messageEditingContext?.setEditedMessage(null, () => {
        this.props.isExitingDuringEditModeRef.current = true;
        this.props.navigation?.dispatch(action);
      });
    };
    if (!this.isMessageEdited()) {
      saveExit();
      return;
    }
    exitEditAlert({
      onDiscard: saveExit,
    });
  };

  onPressJoin = () => {
    void this.props.dispatchActionPromise(
      joinThreadActionTypes,
      this.joinAction(),
    );
  };

  async joinAction(): Promise<ThreadJoinPayload> {
    let joinThreadInput;
    if (this.props.rawThreadInfo.thick) {
      joinThreadInput = {
        thick: true,
        rawThreadInfo: this.props.rawThreadInfo,
      };
    } else {
      const query = this.props.calendarQuery();
      joinThreadInput = {
        thick: false,
        threadID: this.props.threadInfo.id,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [this.props.threadInfo.id] },
          ],
        },
      };
    }

    return await this.props.joinThread(joinThreadInput);
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

const joinThreadLoadingStatusSelector = createLoadingStatusSelector(
  joinThreadActionTypes,
);
const createThreadLoadingStatusSelector =
  createLoadingStatusSelector(newThreadActionTypes);

type ConnectedChatInputBarBaseProps = {
  ...BaseProps,
  +onInputBarLayout?: (event: LayoutEvent) => mixed,
  +openCamera: () => mixed,
  +navigation?: ChatNavigationProp<'MessageList'>,
};
function ConnectedChatInputBarBase(props: ConnectedChatInputBarBaseProps) {
  const navContext = React.useContext(NavContext);
  const keyboardState = React.useContext(KeyboardContext);
  const inputState = React.useContext(InputStateContext);
  const overlayContext = React.useContext(OverlayContext);

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
  const userInfos = useSelector(state => state.userStore.userInfos);

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const isActive = React.useMemo(
    () => props.threadInfo.id === activeThreadSelector(navContext),
    [props.threadInfo.id, navContext],
  );

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const rawThreadInfo = useSelector(
    state => state.threadStore.threadInfos[props.threadInfo.id],
  );
  const callJoinThread = useJoinThread();

  const { getChatMentionSearchIndex } = useChatMentionContext();
  const chatMentionSearchIndex = getChatMentionSearchIndex(props.threadInfo);

  const { parentThreadID, community } = props.threadInfo;
  const parentThreadInfo = useSelector(state =>
    parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
  );
  const communityThreadInfo = useSelector(state =>
    community ? threadInfoSelector(state)[community] : null,
  );

  const threadFrozen = useThreadFrozenDueToViewerBlock(
    props.threadInfo,
    communityThreadInfo,
    viewerID,
    userInfos,
  );

  const userMentionsCandidates = useUserMentionsCandidates(
    props.threadInfo,
    parentThreadInfo,
  );

  const chatMentionCandidates = useThreadChatMentionCandidates(
    props.threadInfo,
  );

  const messageEditingContext = React.useContext(MessageEditingContext);

  const editedMessageInfo = messageEditingContext?.editState.editedMessage;
  const editedMessagePreview = useMessagePreview(
    editedMessageInfo,
    props.threadInfo,
    getDefaultTextMessageRules(chatMentionCandidates).simpleMarkdownRules,
  );
  const editMessage = useEditMessage(props.threadInfo);

  const [selectionState, setSelectionState] =
    React.useState<SyncedSelectionData>({
      text: draft,
      selection: { start: 0, end: 0 },
    });

  const [text, setText] = React.useState(draft);
  const [textEdited, setTextEdited] = React.useState(false);
  const [buttonsExpanded, setButtonsExpanded] = React.useState(true);

  const typeaheadRegexMatches = React.useMemo(
    () =>
      getTypeaheadRegexMatches(
        selectionState.text,
        selectionState.selection,
        nativeMentionTypeaheadRegex,
      ),
    [selectionState.text, selectionState.selection],
  );

  const typeaheadMatchedStrings: ?TypeaheadMatchedStrings =
    React.useMemo(() => {
      if (typeaheadRegexMatches === null) {
        return null;
      }
      return {
        textBeforeAtSymbol: typeaheadRegexMatches[1] ?? '',
        query: typeaheadRegexMatches[4] ?? '',
      };
    }, [typeaheadRegexMatches]);

  const suggestedUsers = useMentionTypeaheadUserSuggestions(
    userMentionsCandidates,
    typeaheadMatchedStrings,
  );

  const suggestedChats = useMentionTypeaheadChatSuggestions(
    chatMentionSearchIndex,
    chatMentionCandidates,
    typeaheadMatchedStrings,
  );

  const suggestions: $ReadOnlyArray<MentionTypeaheadSuggestionItem> =
    React.useMemo(
      () => [...suggestedUsers, ...suggestedChats],
      [suggestedUsers, suggestedChats],
    );

  const currentUserIsVoiced = useThreadHasPermission(
    props.threadInfo,
    threadPermissions.VOICED,
  );

  const currentUserCanJoin = useThreadHasPermission(
    props.threadInfo,
    threadPermissions.JOIN_THREAD,
  );

  const isExitingDuringEditModeRef = React.useRef(false);

  const expandoButtonsOpen = useValue(1);
  const targetExpandoButtonsOpen = useValue(1);

  const initialSendButtonContainerOpen = trimMessage(draft) ? 1 : 0;
  const sendButtonContainerOpen = useValue(initialSendButtonContainerOpen);
  const targetSendButtonContainerOpen = useValue(
    initialSendButtonContainerOpen,
  );

  const iconsOpacity = React.useMemo(() => {
    const prevTargetExpandoButtonsOpen = new Value(1);
    const expandoButtonClock = new Clock();
    return block([
      cond(neq(targetExpandoButtonsOpen, prevTargetExpandoButtonsOpen), [
        stopClock(expandoButtonClock),
        set(prevTargetExpandoButtonsOpen, targetExpandoButtonsOpen),
      ]),
      cond(
        neq(expandoButtonsOpen, targetExpandoButtonsOpen),
        set(
          expandoButtonsOpen,
          runTiming(
            expandoButtonClock,
            expandoButtonsOpen,
            targetExpandoButtonsOpen,
            true,
            expandoButtonsAnimationConfig,
          ),
        ),
      ),
      expandoButtonsOpen,
    ]);
  }, [expandoButtonsOpen, targetExpandoButtonsOpen]);

  const expandoButtonsWidth = React.useMemo(
    () =>
      interpolateNode(iconsOpacity, {
        inputRange: [0, 1],
        outputRange: [26, 66],
      }),
    [iconsOpacity],
  );

  const expandOpacity = React.useMemo(
    () => sub(1, iconsOpacity),
    [iconsOpacity],
  );

  const sendButtonContainerWidth = React.useMemo(() => {
    const prevTargetSendButtonContainerOpen = new Value(
      initialSendButtonContainerOpen,
    );
    const sendButtonClock = new Clock();
    const animatedSendButtonContainerOpen = block([
      cond(
        neq(targetSendButtonContainerOpen, prevTargetSendButtonContainerOpen),
        [
          stopClock(sendButtonClock),
          set(prevTargetSendButtonContainerOpen, targetSendButtonContainerOpen),
        ],
      ),
      cond(
        neq(sendButtonContainerOpen, targetSendButtonContainerOpen),
        set(
          sendButtonContainerOpen,
          runTiming(
            sendButtonClock,
            sendButtonContainerOpen,
            targetSendButtonContainerOpen,
            true,
            sendButtonAnimationConfig,
          ),
        ),
      ),
      sendButtonContainerOpen,
    ]);

    return interpolateNode(animatedSendButtonContainerOpen, {
      inputRange: [0, 1],
      outputRange: [4, 38],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendButtonContainerOpen, targetSendButtonContainerOpen]);

  const cameraRollIconStyle = React.useMemo(
    () => ({
      ...unboundStyles.cameraRollIcon,
      opacity: iconsOpacity,
    }),
    [iconsOpacity],
  );

  const cameraIconStyle = React.useMemo(
    () => ({
      ...unboundStyles.cameraIcon,
      opacity: iconsOpacity,
    }),
    [iconsOpacity],
  );

  const expandoButtonsStyle = React.useMemo(
    () => ({
      ...unboundStyles.expandoButtons,
      width: expandoButtonsWidth,
    }),
    [expandoButtonsWidth],
  );

  const expandIconStyle = React.useMemo(
    () => ({
      ...unboundStyles.expandIcon,
      opacity: expandOpacity,
    }),
    [expandOpacity],
  );

  const sendButtonContainerStyle = React.useMemo(
    () => ({
      width: sendButtonContainerWidth,
    }),
    [sendButtonContainerWidth],
  );

  const shouldShowTextInput = React.useCallback(() => {
    if (currentUserIsVoiced) {
      return true;
    }
    // If the thread is created by somebody else while the viewer is attempting
    // to create it, the threadInfo might be modified in-place
    // and won't list the viewer as a member,
    // which will end up hiding the input.
    // In this case, we will assume that our creation action
    // will get translated into a join, and as long
    // as members are voiced, we can show the input.
    if (!threadCreationInProgress) {
      return false;
    }
    return checkIfDefaultMembersAreVoiced(props.threadInfo);
  }, [currentUserIsVoiced, props.threadInfo, threadCreationInProgress]);

  const isEditMode = React.useCallback(() => {
    const editState = messageEditingContext?.editState;
    const isThisThread =
      editState?.editedMessage?.threadID === props.threadInfo.id;
    return editState?.editedMessage !== null && isThisThread;
  }, [messageEditingContext?.editState, props.threadInfo.id]);

  const immediatelyShowSendButton = React.useCallback(() => {
    sendButtonContainerOpen.setValue(1);
    targetSendButtonContainerOpen.setValue(1);
  }, [sendButtonContainerOpen, targetSendButtonContainerOpen]);

  const updateSendButton = React.useCallback(
    (currentText: string) => {
      const targetValue = currentText === '' ? 0 : 1;
      targetSendButtonContainerOpen.setValue(targetValue);
      if (!shouldShowTextInput) {
        sendButtonContainerOpen.setValue(targetValue);
      }
    },
    [
      sendButtonContainerOpen,
      shouldShowTextInput,
      targetSendButtonContainerOpen,
    ],
  );

  const expandButtons = React.useCallback(() => {
    if (buttonsExpanded || isEditMode()) {
      return;
    }
    targetExpandoButtonsOpen.setValue(1);
    setButtonsExpanded(true);
  }, [buttonsExpanded, isEditMode, targetExpandoButtonsOpen]);

  const hideButtons = React.useCallback(() => {
    if (
      keyboardState?.mediaGalleryOpen ||
      !keyboardState?.systemKeyboardShowing ||
      !buttonsExpanded
    ) {
      return;
    }
    targetExpandoButtonsOpen.setValue(0);
    setButtonsExpanded(false);
  }, [
    buttonsExpanded,
    keyboardState?.mediaGalleryOpen,
    keyboardState?.systemKeyboardShowing,
    targetExpandoButtonsOpen,
  ]);

  const immediatelyHideButtons = React.useCallback(() => {
    expandoButtonsOpen.setValue(0);
    targetExpandoButtonsOpen.setValue(0);
    setButtonsExpanded(false);
  }, [expandoButtonsOpen, targetExpandoButtonsOpen]);

  const textInputRef = React.useRef<?React.ElementRef<typeof TextInput>>();
  const clearableTextInputRef = React.useRef<?ClearableTextInput>();
  const selectableTextInputRef =
    React.useRef<?React.ElementRef<typeof SelectableTextInput>>();
  const setTextInputRef = React.useCallback(
    (ref: ?React.ElementRef<typeof TextInput>) => {
      textInputRef.current = ref;
    },
    [],
  );
  const setClearableTextInputRef = React.useCallback(
    (ref: ?ClearableTextInput) => {
      clearableTextInputRef.current = ref;
    },
    [],
  );

  return (
    <ChatInputBar
      {...props}
      viewerID={viewerID}
      rawThreadInfo={rawThreadInfo}
      draft={draft}
      joinThreadLoadingStatus={joinThreadLoadingStatus}
      threadCreationInProgress={threadCreationInProgress}
      calendarQuery={calendarQuery}
      colors={colors}
      styles={styles}
      isActive={isActive}
      keyboardState={keyboardState}
      dispatch={dispatch}
      dispatchActionPromise={dispatchActionPromise}
      joinThread={callJoinThread}
      inputState={inputState}
      userMentionsCandidates={userMentionsCandidates}
      chatMentionSearchIndex={chatMentionSearchIndex}
      chatMentionCandidates={chatMentionCandidates}
      parentThreadInfo={parentThreadInfo}
      editedMessagePreview={editedMessagePreview}
      editedMessageInfo={editedMessageInfo}
      editMessage={editMessage}
      navigation={props.navigation}
      overlayContext={overlayContext}
      messageEditingContext={messageEditingContext}
      selectionState={selectionState}
      setSelectionState={setSelectionState}
      suggestions={suggestions}
      typeaheadMatchedStrings={typeaheadMatchedStrings}
      currentUserIsVoiced={currentUserIsVoiced}
      currentUserCanJoin={currentUserCanJoin}
      threadFrozen={threadFrozen}
      text={text}
      setText={setText}
      textEdited={textEdited}
      setTextEdited={setTextEdited}
      buttonsExpanded={buttonsExpanded}
      isExitingDuringEditModeRef={isExitingDuringEditModeRef}
      cameraRollIconStyle={cameraRollIconStyle}
      cameraIconStyle={cameraIconStyle}
      expandoButtonsStyle={expandoButtonsStyle}
      expandIconStyle={expandIconStyle}
      sendButtonContainerStyle={sendButtonContainerStyle}
      shouldShowTextInput={shouldShowTextInput}
      isEditMode={isEditMode}
      immediatelyShowSendButton={immediatelyShowSendButton}
      updateSendButton={updateSendButton}
      expandButtons={expandButtons}
      hideButtons={hideButtons}
      immediatelyHideButtons={immediatelyHideButtons}
      textInputRef={textInputRef}
      clearableTextInputRef={clearableTextInputRef}
      selectableTextInputRef={selectableTextInputRef}
      setTextInputRef={setTextInputRef}
      setClearableTextInputRef={setClearableTextInputRef}
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
      (imagePastedEvent: ImagePasteEvent) => {
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
      navigation.navigate<'ChatCameraModal'>({
        name: ChatCameraModalRouteName,
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
        navigation={navigation}
      />
    );
  });

export { ConnectedChatInputBar as ChatInputBar, DummyChatInputBar };
