// @flow

import Icon from '@expo/vector-icons/Ionicons';
import invariant from 'invariant';
import _omit from 'lodash/fp/omit';
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
import Animated, { EasingNode } from 'react-native-reanimated';
import type { SelectionChangeEvent } from 'react-native/Libraries/Components/TextInput/TextInput';
import { useDispatch } from 'react-redux';
import shallowequal from 'shallowequal';

import {
  moveDraftActionType,
  updateDraftActionType,
} from 'lib/actions/draft-actions';
import {
  joinThreadActionTypes,
  joinThread,
  newThreadActionTypes,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  relativeMemberInfoSelectorForMembersOfThread,
  userStoreSearchIndex,
} from 'lib/selectors/user-selectors';
import { localIDPrefix, trimMessage } from 'lib/shared/message-utils';
import SearchIndex from 'lib/shared/search-index';
import {
  threadHasPermission,
  viewerIsMember,
  threadFrozenDueToViewerBlock,
  threadActualMembers,
  checkIfDefaultMembersAreVoiced,
  draftKeyFromThreadID,
  colorIsDark,
} from 'lib/shared/thread-utils';
import { getTypeaheadUserSuggestions } from 'lib/shared/typeahead-utils';
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
import type { RelativeMemberInfo } from 'lib/types/thread-types';
import { type UserInfos } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../components/button.react';
import ClearableTextInput from '../components/clearable-text-input.react';
import SWMansionIcon from '../components/swmansion-icon.react';
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
import type { LayoutEvent } from '../types/react-native';
import { type AnimatedViewStyle, AnimatedView } from '../types/styles';
import { runTiming } from '../utils/animation-utils';
import { waitForAnimationFrameFlush } from '../utils/timers';
import { nativeTypeaheadRegex } from '../utils/typeahead-utils';
import { ChatContext } from './chat-context';
import type { ChatNavigationProp } from './chat.react';
import TypeaheadTooltip from './typeahead-tooltip.react';

/* eslint-disable import/no-named-as-default-member */
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
} = Animated;
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
  +onInputBarLayout?: (event: LayoutEvent) => mixed,
  +openCamera: () => mixed,
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
  +userSearchIndex: SearchIndex,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
};

export type Selection = {
  +start: number,
  +end: number,
};

type State = {
  +text: string,
  +textEdited: boolean,
  +buttonsExpanded: boolean,
  +selection: Selection,
  +controlSelection: boolean,
};
class ChatInputBar extends React.Component<Props, State> {
  textInput: ?React.ElementRef<typeof TextInput>;
  clearableTextInput: ?ClearableTextInput;

  expandoButtonsOpen: Value;
  targetExpandoButtonsOpen: Value;
  expandoButtonsStyle: AnimatedViewStyle;
  cameraRollIconStyle: AnimatedViewStyle;
  cameraIconStyle: AnimatedViewStyle;
  expandIconStyle: AnimatedViewStyle;

  sendButtonContainerOpen: Value;
  targetSendButtonContainerOpen: Value;
  sendButtonContainerStyle: AnimatedViewStyle;

  // Refs are needed for hacks used to display typeahead properly
  // There was a problem with the typeahead flickering.
  // There are two events coming from TextInput: text change
  // and selection change. Those two events triggered two rerenders
  // which caused flickering of typeahead as regex wasn't matched
  // after just one of those. They also come in different order
  // based on platform. SelectionChange happens first on iOS
  // but TextChange happens first on Android. That is the reason
  // we need separate workarounds for two platforms
  // iOS hack:
  // Introduce iosKeyWasPressed ref and set it to true on onKeyPress event.
  // It happens before the other two events
  // (on iOS, it happens in the end on Android)
  // Then we only rerender the ChatInputBar on selection change
  // if iosKeyWasPressed is set to false, e.g. when user moves cursor.
  // If it's set to true, we skip rerender if other props/state haven't
  // changed
  iosKeyWasPressed: boolean;
  // Android hack:
  // Because an order of events is different, we can't use the previous
  // method. Setting flag on text change and then setting state
  // on selection change caused extra events being emitted from native
  // side. It was probably a reaction to setting text state and trying to
  // control component. I used a different approach. We perform two rerenders
  // but use androidPreviousText when creating typeahead.
  // This way, already updated text is not processed along with old selection
  // We set it to null, when new selection is set.
  androidPreviousText: ?string;

  constructor(props: Props) {
    super(props);
    this.state = {
      text: props.draft,
      textEdited: false,
      buttonsExpanded: true,
      selection: { start: 0, end: 0 },
      controlSelection: false,
    };

    this.setUpActionIconAnimations();
    this.setUpSendIconAnimations();
    this.iosKeyWasPressed = false;
    this.androidPreviousText = null;
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
      this.addReplyListener();
    }
  }

  componentWillUnmount() {
    if (this.props.isActive) {
      this.removeReplyListener();
    }
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    if (Platform.OS !== 'ios') {
      return (
        !shallowequal(nextState, this.state) ||
        !shallowequal(nextProps, this.props)
      );
    }

    // we want to rerender only when selection changed, but key was not pressed
    const selectionChangedWithoutKeyPress =
      !this.iosKeyWasPressed && nextState.selection !== this.state.selection;

    return (
      !shallowequal(
        _omit(['selection'])(nextState),
        _omit(['selection'])(this.state),
      ) ||
      !shallowequal(nextProps, this.props) ||
      selectionChangedWithoutKeyPress
    );
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
              { backgroundColor: `#${this.props.threadInfo.color}` },
            ]}
          >
            {buttonContent}
          </Button>
        </View>
      );
    }

    // we only try to match if there is end of text or whitespace after cursor
    let typeaheadRegexMatches = null;
    if (
      this.state.selection.start === this.state.selection.end &&
      (this.state.selection.start === this.state.text.length ||
        /\s/.test(this.state.text[this.state.selection.end]))
    ) {
      typeaheadRegexMatches = this.state.text
        .slice(0, this.state.selection.start)
        .match(nativeTypeaheadRegex);
    }

    if (
      this.androidPreviousText &&
      this.state.selection.start === this.state.selection.end &&
      (this.state.selection.start === this.androidPreviousText.length ||
        /\s/.test(this.androidPreviousText[this.state.selection.end]))
    ) {
      typeaheadRegexMatches = this.androidPreviousText
        .slice(0, this.state.selection.start)
        .match(nativeTypeaheadRegex);
    }

    let typeaheadMatchedStrings = null;
    if (typeaheadRegexMatches) {
      typeaheadMatchedStrings = {
        textBeforeAtSymbol: typeaheadRegexMatches[1] ?? '',
        usernamePrefix: typeaheadRegexMatches[4] ?? '',
      };
    }

    const suggestedUsers = typeaheadMatchedStrings
      ? getTypeaheadUserSuggestions(
          this.props.userSearchIndex,
          this.props.threadMembers,
          this.props.viewerID,
          typeaheadMatchedStrings.usernamePrefix,
        )
      : [];

    const typeaheadTooltip =
      suggestedUsers.length > 0 && typeaheadMatchedStrings ? (
        <TypeaheadTooltip
          text={this.state.text}
          matchedStrings={typeaheadMatchedStrings}
          suggestedUsers={suggestedUsers}
          focusAndUpdateTextAndSelection={this.focusAndUpdateTextAndSelection}
        />
      ) : null;

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

    return (
      <View
        style={this.props.styles.container}
        onLayout={this.props.onInputBarLayout}
      >
        {typeaheadTooltip}
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
          <ClearableTextInput
            allowImagePasteForThreadID={this.props.threadInfo.id}
            value={this.state.text}
            onChangeText={this.updateText}
            selection={
              this.state.controlSelection ? this.state.selection : undefined
            }
            onSelectionChange={this.updateSelection}
            onKeyPress={this.onKeyPress}
            placeholder="Send a message..."
            placeholderTextColor={this.props.colors.listInputButton}
            multiline={true}
            style={this.props.styles.textInput}
            textInputRef={this.textInputRef}
            ref={this.clearableTextInputRef}
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

  onKeyPress = () => {
    if (Platform.OS === 'ios') {
      this.iosKeyWasPressed = true;
    }
  };

  updateText = (text: string) => {
    if (Platform.OS === 'ios') {
      this.iosKeyWasPressed = false;
    }
    if (Platform.OS === 'android') {
      this.androidPreviousText = this.state.text;
    }

    this.setState({ text, textEdited: true, controlSelection: false });
    this.saveDraft(text);
  };

  updateSelection: (event: SelectionChangeEvent) => void = event => {
    // we introduced controlSelection state to avoid flickering of selection
    // it is workaround that allow as only control selection in concrete
    // situations, like clicking into typeahead button
    // in other situations it is handled by native side, and we don't control it

    if (Platform.OS === 'android') {
      this.androidPreviousText = null;
    }

    this.setState({
      selection: {
        start: event.nativeEvent.selection.start,
        end: event.nativeEvent.selection.end,
      },
      controlSelection: false,
    });
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
    // On iOS, the update of text below will trigger a selection change which
    // will overwrite our update of selection. To address this, we schedule a
    // second update of selection after waiting for the animation frame to
    // flush. We also make sure that the overwriting selection change is not
    // saved to our selection state by ignoring selection updates until our
    // second update.
    this.setState(
      {
        text,
        textEdited: true,
        selection,
        controlSelection: true,
      },
      async () => {
        if (Platform.OS !== 'ios') {
          return;
        }
        await waitForAnimationFrameFlush();
        this.setState({
          selection,
          controlSelection: true,
        });
      },
    );
    this.saveDraft(text);

    this.focusAndUpdateButtonsVisibility();
  };

  focusAndUpdateText = (text: string) => {
    const currentText = this.state.text;
    if (!currentText.startsWith(text)) {
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
const createThreadLoadingStatusSelector = createLoadingStatusSelector(
  newThreadActionTypes,
);

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
  const threadMembers = useSelector(
    relativeMemberInfoSelectorForMembersOfThread(props.threadInfo.id),
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
      threadMembers={threadMembers}
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
const ConnectedChatInputBar: React.ComponentType<ChatInputBarProps> = React.memo<ChatInputBarProps>(
  function ConnectedChatInputBar(props: ChatInputBarProps) {
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
  },
);

export { ConnectedChatInputBar as ChatInputBar, DummyChatInputBar };
