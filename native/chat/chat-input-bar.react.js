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
  trimMessage,
  useMessagePreview,
  getNextLocalID,
} from 'lib/shared/message-utils.js';
import {
  checkIfDefaultMembersAreVoiced,
  draftKeyFromThreadID,
  threadActualMembers,
  useThreadFrozenDueToViewerBlock,
  useThreadHasPermission,
  viewerIsMember,
} from 'lib/shared/thread-utils.js';
import type { PhotoPaste } from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { MessageInfo } from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import type { ThreadJoinPayload } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { ChatContext } from './chat-context.js';
import type { ChatNavigationProp } from './chat.react.js';
import { MessageEditingContext } from './message-editing-context.react.js';
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
  InputStateContext,
} from '../input/input-state.js';
import KeyboardInputHost from '../keyboard/keyboard-input-host.react.js';
import { KeyboardContext } from '../keyboard/keyboard-state.js';
import { getKeyboardHeight } from '../keyboard/keyboard.js';
import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import {
  activeThreadSelector,
  nonThreadCalendarQuery,
} from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import {
  ChatCameraModalRouteName,
  ImagePasteModalRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import type { ImagePasteEvent, LayoutEvent } from '../types/react-native.js';
import { AnimatedView, type ViewStyle } from '../types/styles.js';
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

  const expandoButtonsWidth = React.useMemo(() => {
    return interpolateNode(iconsOpacity, {
      inputRange: [0, 1],
      outputRange: [26, 66],
    });
  }, [iconsOpacity]);

  const expandOpacity = React.useMemo(() => {
    return sub(1, iconsOpacity);
  }, [iconsOpacity]);

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
  }, [
    initialSendButtonContainerOpen,
    sendButtonContainerOpen,
    targetSendButtonContainerOpen,
  ]);

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
      if (shouldShowTextInput()) {
        targetSendButtonContainerOpen.setValue(currentText === '' ? 0 : 1);
      }
    },
    [shouldShowTextInput, targetSendButtonContainerOpen],
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

  const saveDraft = React.useMemo(
    () =>
      _throttle(newText => {
        dispatch({
          type: updateDraftActionType,
          payload: {
            key: draftKeyFromThreadID(props.threadInfo.id),
            text: newText,
          },
        });
      }, 400),
    [dispatch, props.threadInfo.id],
  );

  const isMessageEdited = React.useCallback(
    (newText?: string): boolean => {
      let updatedText = newText ?? text;
      updatedText = trimMessage(updatedText);
      const originalText = editedMessageInfo?.text;
      return updatedText !== originalText;
    },
    [editedMessageInfo?.text, text],
  );

  const updateText = React.useCallback(
    (newText: string) => {
      if (isExitingDuringEditModeRef.current) {
        return;
      }
      setText(newText);
      setTextEdited(true);
      messageEditingContext?.setEditedMessageChanged(isMessageEdited(newText));
      if (isEditMode()) {
        return;
      }
      saveDraft(newText);
    },
    [isEditMode, isMessageEdited, messageEditingContext, saveDraft],
  );

  const focusAndUpdateButtonsVisibility = React.useCallback(() => {
    const textInput = textInputRef.current;

    if (!textInput) {
      return;
    }

    immediatelyShowSendButton();
    immediatelyHideButtons();
    textInput.focus();
  }, [immediatelyHideButtons, immediatelyShowSendButton]);

  const unblockNavigation = React.useCallback(() => {
    const { navigation } = props;
    if (!navigation) {
      return;
    }
    navigation.setParams({ removeEditMode: null });
  }, [props]);

  const exitEditMode = React.useCallback(() => {
    messageEditingContext?.setEditedMessage(null, () => {
      unblockNavigation();
      updateText(draft);
      focusAndUpdateButtonsVisibility();
      updateSendButton(draft);
    });
  }, [
    draft,
    focusAndUpdateButtonsVisibility,
    messageEditingContext,
    unblockNavigation,
    updateSendButton,
    updateText,
  ]);

  const editMessageInner = React.useCallback(
    async (messageID: string, newText: string) => {
      if (!isMessageEdited()) {
        exitEditMode();
        return;
      }
      newText = trimMessage(newText);
      try {
        await editMessage(messageID, newText);
        exitEditMode();
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
    },
    [editMessage, exitEditMode, isMessageEdited],
  );

  const focusAndUpdateText = React.useCallback(
    (params: EditInputBarMessageParameters) => {
      const { message, mode } = params;
      const currentText = text;
      if (mode === 'replace') {
        updateText(message);
      } else if (!currentText.startsWith(message)) {
        const prependedText = message.concat(currentText);
        updateText(prependedText);
      }

      focusAndUpdateButtonsVisibility();
    },
    [focusAndUpdateButtonsVisibility, text, updateText],
  );

  const addEditInputMessageListener = React.useCallback(() => {
    invariant(
      inputState,
      'inputState should be set in addEditInputMessageListener',
    );
    inputState.addEditInputMessageListener(focusAndUpdateText);
  }, [focusAndUpdateText, inputState]);

  const removeEditInputMessageListener = React.useCallback(() => {
    invariant(
      inputState,
      'inputState should be set in removeEditInputMessageListener',
    );
    inputState.removeEditInputMessageListener(focusAndUpdateText);
  }, [focusAndUpdateText, inputState]);

  const focusAndUpdateTextAndSelection = React.useCallback(
    (newText: string, selection: Selection) => {
      selectableTextInputRef.current?.prepareForSelectionMutation(
        newText,
        selection,
      );
      setText(newText);
      setTextEdited(true);
      setSelectionState({ text: newText, selection });
      saveDraft(newText);

      focusAndUpdateButtonsVisibility();
    },
    [focusAndUpdateButtonsVisibility, saveDraft],
  );

  const getEditedMessage = React.useCallback((): ?MessageInfo => {
    const editState = messageEditingContext?.editState;
    return editState?.editedMessage;
  }, [messageEditingContext?.editState]);

  const onSend = React.useCallback(async () => {
    if (!trimMessage(text)) {
      return;
    }

    const editedMessage = getEditedMessage();
    if (editedMessage && editedMessage.id) {
      await editMessageInner(editedMessage.id, text);
      return;
    }

    updateSendButton('');

    const clearableTextInput = clearableTextInputRef.current;
    invariant(
      clearableTextInput,
      'clearableTextInput should be sent in onSend',
    );
    let newText = await clearableTextInput.getValueAndReset();
    newText = trimMessage(newText);
    if (!newText) {
      return;
    }

    const localID = getNextLocalID();
    const creatorID = viewerID;
    invariant(creatorID, 'should have viewer ID in order to send a message');
    invariant(inputState, 'inputState should be set in ChatInputBar.onSend');

    await inputState.sendTextMessage(
      {
        type: messageTypes.TEXT,
        localID,
        threadID: props.threadInfo.id,
        text: newText,
        creatorID,
        time: Date.now(),
      },
      props.threadInfo,
      parentThreadInfo,
    );
  }, [
    editMessageInner,
    getEditedMessage,
    inputState,
    parentThreadInfo,
    props.threadInfo,
    text,
    updateSendButton,
    viewerID,
  ]);

  const removeEditMode: RemoveEditMode = React.useCallback(
    action => {
      const { navigation } = props;
      if (!navigation || isExitingDuringEditModeRef.current) {
        return 'ignore_action';
      }
      if (!isMessageEdited()) {
        unblockNavigation();
        return 'reduce_action';
      }
      const unblockAndDispatch = () => {
        unblockNavigation();
        navigation.dispatch(action);
      };
      const onContinueEditing = () => {
        overlayContext?.resetScrollBlockingModalStatus();
      };
      exitEditAlert({
        onDiscard: unblockAndDispatch,
        onContinueEditing,
      });
      return 'ignore_action';
    },
    [isMessageEdited, overlayContext, props, unblockNavigation],
  );

  const onPressExitEditMode = React.useCallback(() => {
    if (!isMessageEdited()) {
      exitEditMode();
      return;
    }
    exitEditAlert({
      onDiscard: exitEditMode,
    });
  }, [exitEditMode, isMessageEdited]);

  const scrollToEditedMessage = React.useCallback(() => {
    const editedMessage = getEditedMessage();
    if (!editedMessage) {
      return;
    }
    const editedMessageKey = messageKey(editedMessage);
    inputState?.scrollToMessage(editedMessageKey);
  }, [getEditedMessage, inputState]);

  const blockNavigation = React.useCallback(() => {
    const { navigation } = props;
    if (!navigation || !navigation.isFocused()) {
      return;
    }
    navigation.setParams({
      removeEditMode: removeEditMode,
    });
  }, [props, removeEditMode]);

  const onNavigationFocus = React.useCallback(() => {
    isExitingDuringEditModeRef.current = false;
  }, []);

  const onNavigationBlur = React.useCallback(() => {
    if (!isEditMode()) {
      return;
    }
    setText(draft);
    isExitingDuringEditModeRef.current = true;
    exitEditMode();
  }, [draft, exitEditMode, isEditMode]);

  const onNavigationBeforeRemove = React.useCallback(
    (e: {
      +data: { +action: GenericNavigationAction },
      +preventDefault: () => void,
      ...
    }) => {
      if (!isEditMode()) {
        return;
      }
      const { action } = e.data;
      e.preventDefault();
      const saveExit = () => {
        messageEditingContext?.setEditedMessage(null, () => {
          isExitingDuringEditModeRef.current = true;
          props.navigation?.dispatch(action);
        });
      };
      if (!isMessageEdited()) {
        saveExit();
        return;
      }
      exitEditAlert({
        onDiscard: saveExit,
      });
    },
    [isEditMode, isMessageEdited, messageEditingContext, props.navigation],
  );

  React.useEffect(() => {
    const { navigation } = props;

    if (isActive) {
      addEditInputMessageListener();
    }

    const clearBeforeRemoveListener = navigation?.addListener(
      'beforeRemove',
      onNavigationBeforeRemove,
    );
    const clearFocusListener = navigation?.addListener(
      'focus',
      onNavigationFocus,
    );
    const clearBlurListener = navigation?.addListener('blur', onNavigationBlur);
    return () => {
      if (isActive) {
        removeEditInputMessageListener();
      }
      clearBeforeRemoveListener?.();
      clearFocusListener?.();
      clearBlurListener?.();
    };
  }, [
    addEditInputMessageListener,
    isActive,
    onNavigationBeforeRemove,
    onNavigationBlur,
    onNavigationFocus,
    props,
    removeEditInputMessageListener,
  ]);

  const joinAction = React.useCallback(async (): Promise<ThreadJoinPayload> => {
    let joinThreadInput;
    if (rawThreadInfo.thick) {
      joinThreadInput = {
        thick: true,
        rawThreadInfo: rawThreadInfo,
      };
    } else {
      const query = calendarQuery();
      joinThreadInput = {
        thick: false,
        threadID: props.threadInfo.id,
        calendarQuery: {
          startDate: query.startDate,
          endDate: query.endDate,
          filters: [
            ...query.filters,
            { type: 'threads', threadIDs: [props.threadInfo.id] },
          ],
        },
      };
    }

    return await callJoinThread(joinThreadInput);
  }, [calendarQuery, callJoinThread, props.threadInfo.id, rawThreadInfo]);

  const onPressJoin = React.useCallback(() => {
    void dispatchActionPromise(joinThreadActionTypes, joinAction());
  }, [dispatchActionPromise, joinAction]);

  const setIOSKeyboardHeight = React.useCallback(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    const textInput = textInputRef.current;
    if (!textInput) {
      return;
    }
    const keyboardHeight = getKeyboardHeight();
    if (keyboardHeight === null || keyboardHeight === undefined) {
      return;
    }
    TextInputKeyboardMangerIOS.setKeyboardHeight(textInput, keyboardHeight);
  }, []);

  const showMediaGallery = React.useCallback(() => {
    invariant(keyboardState, 'keyboardState should be initialized');
    keyboardState.showMediaGallery(props.threadInfo);
  }, [keyboardState, props.threadInfo]);

  const dismissKeyboard = React.useCallback(() => {
    keyboardState?.dismissKeyboard();
  }, [keyboardState]);

  const prevThreadInfoId = React.useRef<?string>();
  const prevDraft = React.useRef<?string>();

  React.useEffect(() => {
    if (
      textEdited &&
      text &&
      prevThreadInfoId.current &&
      props.threadInfo.id !== prevThreadInfoId.current
    ) {
      dispatch({
        type: moveDraftActionType,
        payload: {
          oldKey: draftKeyFromThreadID(prevThreadInfoId.current),
          newKey: draftKeyFromThreadID(props.threadInfo.id),
        },
      });
    } else if (!textEdited && draft !== prevDraft.current) {
      setText(draft);
    }
    prevThreadInfoId.current = props.threadInfo.id;
    prevDraft.current = draft;
  }, [dispatch, draft, props.threadInfo.id, text, textEdited]);

  React.useEffect(() => {
    if (isActive) {
      addEditInputMessageListener();
    } else if (!isActive) {
      removeEditInputMessageListener();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const prevTextRef = React.useRef(text);
  React.useEffect(() => {
    const currentText = trimMessage(text);
    const prevText = trimMessage(prevTextRef.current);
    prevTextRef.current = currentText;

    if (
      (currentText === '' && prevText !== '') ||
      (currentText !== '' && prevText === '')
    ) {
      updateSendButton(currentText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  React.useEffect(() => {
    if (keyboardState?.systemKeyboardShowing) {
      hideButtons();
    } else {
      expandButtons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardState?.systemKeyboardShowing]);

  React.useEffect(() => {
    if (!keyboardState?.mediaGalleryOpen) {
      hideButtons();
    } else {
      expandButtons();
      setIOSKeyboardHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardState?.mediaGalleryOpen]);

  React.useEffect(() => {
    if (messageEditingContext?.editState.editedMessage) {
      blockNavigation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageEditingContext?.editState.editedMessage]);

  const renderInput = () => {
    const expandoButton = (
      <TouchableOpacity
        onPress={expandButtons}
        activeOpacity={0.4}
        style={styles.expandButton}
      >
        <AnimatedView style={expandIconStyle}>
          <SWMansionIcon
            name="chevron-right"
            size={22}
            color={`#${props.threadInfo.color}`}
          />
        </AnimatedView>
      </TouchableOpacity>
    );
    const threadColor = `#${props.threadInfo.color}`;
    const expandoButtonsViewStyle: Array<ViewStyle> = [
      styles.innerExpandoButtons,
    ];
    if (isEditMode()) {
      expandoButtonsViewStyle.push({ display: 'none' });
    }
    return (
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.inputContainer}>
          <AnimatedView style={expandoButtonsStyle}>
            <View style={expandoButtonsViewStyle}>
              {buttonsExpanded ? expandoButton : null}
              <TouchableOpacity onPress={showMediaGallery} activeOpacity={0.4}>
                <AnimatedView style={cameraRollIconStyle}>
                  <SWMansionIcon
                    name="image-1"
                    size={28}
                    color={`#${props.threadInfo.color}`}
                  />
                </AnimatedView>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={props.openCamera}
                activeOpacity={0.4}
                disabled={!buttonsExpanded}
              >
                <AnimatedView style={cameraIconStyle}>
                  <SWMansionIcon
                    name="camera"
                    size={28}
                    color={`#${props.threadInfo.color}`}
                  />
                </AnimatedView>
              </TouchableOpacity>
              {buttonsExpanded ? null : expandoButton}
            </View>
          </AnimatedView>
          <SelectableTextInput
            allowImagePasteForThreadID={props.threadInfo.id}
            value={text}
            onChangeText={updateText}
            selection={selectionState.selection}
            onUpdateSyncedSelectionData={setSelectionState}
            placeholder="Send a message..."
            placeholderTextColor={colors.listInputButton}
            multiline={true}
            style={styles.textInput}
            textInputRef={setTextInputRef}
            clearableTextInputRef={setClearableTextInputRef}
            ref={selectableTextInputRef}
            selectionColor={`#${props.threadInfo.color}`}
          />
          <AnimatedView style={sendButtonContainerStyle}>
            <TouchableOpacity
              onPress={onSend}
              activeOpacity={0.4}
              style={styles.sendButton}
              disabled={trimMessage(text) === ''}
            >
              <Icon
                name="md-send"
                size={25}
                style={styles.sendIcon}
                color={threadColor}
              />
            </TouchableOpacity>
          </AnimatedView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const isMember = viewerIsMember(props.threadInfo);
  let joinButton = null;
  const threadColor = `#${props.threadInfo.color}`;

  if (!isMember && currentUserCanJoin && !threadCreationInProgress) {
    let buttonContent;
    if (joinThreadLoadingStatus === 'loading') {
      buttonContent = (
        <ActivityIndicator
          size="small"
          color="white"
          style={styles.joinThreadLoadingIndicator}
        />
      );
    } else {
      const textStyle = colorIsDark(props.threadInfo.color)
        ? styles.joinButtonTextLight
        : styles.joinButtonTextDark;
      buttonContent = (
        <View style={styles.joinButtonContent}>
          <SWMansionIcon name="plus" style={textStyle} />
          <Text style={textStyle}>Join Chat</Text>
        </View>
      );
    }
    joinButton = (
      <View style={styles.joinButtonContainer}>
        <Button
          onPress={onPressJoin}
          iosActiveOpacity={0.85}
          style={[styles.joinButton, { backgroundColor: threadColor }]}
        >
          {buttonContent}
        </Button>
      </View>
    );
  }

  let typeaheadTooltip = null;

  if (suggestions.length > 0 && typeaheadMatchedStrings && !isEditMode) {
    typeaheadTooltip = (
      <TypeaheadTooltip
        text={text}
        matchedStrings={typeaheadMatchedStrings}
        suggestions={suggestions}
        focusAndUpdateTextAndSelection={focusAndUpdateTextAndSelection}
        typeaheadTooltipActionsGetter={mentionTypeaheadTooltipActions}
        TypeaheadTooltipButtonComponent={MentionTypeaheadTooltipButton}
      />
    );
  }

  let content;
  const defaultMembersAreVoiced = checkIfDefaultMembersAreVoiced(
    props.threadInfo,
  );
  if (shouldShowTextInput()) {
    content = renderInput();
  } else if (
    threadFrozen &&
    threadActualMembers(props.threadInfo.members).length === 2
  ) {
    content = (
      <Text style={styles.explanation}>
        You can&rsquo;t send messages to a user that you&rsquo;ve blocked.
      </Text>
    );
  } else if (isMember) {
    content = (
      <Text style={styles.explanation}>
        You don&rsquo;t have permission to send messages.
      </Text>
    );
  } else if (defaultMembersAreVoiced && currentUserCanJoin) {
    content = null;
  } else {
    content = (
      <Text style={styles.explanation}>
        You don&rsquo;t have permission to send messages.
      </Text>
    );
  }

  const keyboardInputHost =
    Platform.OS === 'android' ? null : (
      <KeyboardInputHost textInputRef={textInputRef.current} />
    );

  let editedMessage;
  if (isEditMode && editedMessagePreview) {
    const { message } = editedMessagePreview;
    editedMessage = (
      <AnimatedView
        style={styles.editView}
        entering={FadeInDown}
        exiting={FadeOutDown}
      >
        <View style={styles.editViewContent}>
          <TouchableOpacity onPress={scrollToEditedMessage} activeOpacity={0.4}>
            <Text style={[{ color: threadColor }, styles.editingLabel]}>
              Editing message
            </Text>
            <SingleLine style={styles.editingMessagePreview}>
              {message.text}
            </SingleLine>
          </TouchableOpacity>
        </View>
        <SWMansionIcon
          style={styles.exitEditButton}
          name="cross"
          size={22}
          color={threadColor}
          onPress={onPressExitEditMode}
        />
      </AnimatedView>
    );
  }

  return (
    <AnimatedView style={styles.container} onLayout={props.onInputBarLayout}>
      {typeaheadTooltip}
      {joinButton}
      {editedMessage}
      {content}
      {keyboardInputHost}
    </AnimatedView>
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
