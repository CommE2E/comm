// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import { messageKey } from 'lib/shared/message-utils.js';
import { useCanCreateSidebarFromMessage } from 'lib/shared/sidebar-utils.js';
import { useThreadHasPermission } from 'lib/shared/thread-utils.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { useCanDeleteMessage } from 'lib/utils/delete-message-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import ComposedMessage from './composed-message.react.js';
import { InnerTextMessage } from './inner-text-message.react.js';
import { MessageEditingContext } from './message-editing-context.react.js';
import {
  MessagePressResponderContext,
  type MessagePressResponderContextType,
} from './message-press-responder-context.js';
import textMessageSendFailed from './text-message-send-failed.js';
import { getMessageTooltipKey } from './utils.js';
import { ChatContext, type ChatContextType } from '../chat/chat-context.js';
import { MarkdownContext } from '../markdown/markdown-context.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { useCanEditMessageNative } from '../navigation/nav-selectors.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import { TextMessageTooltipModalRouteName } from '../navigation/route-names.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { fixedTooltipHeight } from '../tooltip/tooltip.react.js';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';

type BaseProps = {
  ...React.ElementConfig<typeof View>,
  +item: ChatTextMessageInfoItemWithHeight,
  +navigation:
    | ChatNavigationProp<'MessageList'>
    | AppNavigationProp<'TogglePinModal'>
    | ChatNavigationProp<'PinnedMessagesScreen'>
    | ChatNavigationProp<'MessageSearch'>,
  +route:
    | NavigationRoute<'MessageList'>
    | NavigationRoute<'TogglePinModal'>
    | NavigationRoute<'PinnedMessagesScreen'>
    | NavigationRoute<'MessageSearch'>,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
  +canTogglePins: boolean,
  +shouldDisplayPinIndicator: boolean,
};
type Props = {
  ...BaseProps,
  // Redux state
  +canCreateSidebarFromMessage: boolean,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // ChatContext
  +chatContext: ?ChatContextType,
  // MarkdownContext
  +isLinkModalActive: boolean,
  +isUserProfileBottomSheetActive: boolean,
  +canEditMessage: boolean,
  +currentUserIsVoiced: boolean,
  +canDeleteMessage: boolean,
};
class TextMessage extends React.PureComponent<Props> {
  message: ?React.ElementRef<typeof View>;
  messagePressResponderContext: MessagePressResponderContextType;

  constructor(props: Props) {
    super(props);
    this.messagePressResponderContext = {
      onPressMessage: this.onPress,
    };
  }

  render(): React.Node {
    const {
      item,
      navigation,
      route,
      focused,
      toggleFocus,
      verticalBounds,
      shouldDisplayPinIndicator,
      overlayContext,
      chatContext,
      isLinkModalActive,
      isUserProfileBottomSheetActive,
      canCreateSidebarFromMessage,
      canEditMessage,
      canTogglePins,
      currentUserIsVoiced,
      canDeleteMessage,
      ...viewProps
    } = this.props;

    let swipeOptions = 'none';
    const canReply = this.canReply();
    const canNavigateToSidebar = this.canNavigateToSidebar();
    if (isLinkModalActive) {
      swipeOptions = 'none';
    } else if (canReply && canNavigateToSidebar) {
      swipeOptions = 'both';
    } else if (canReply) {
      swipeOptions = 'reply';
    } else if (canNavigateToSidebar) {
      swipeOptions = 'sidebar';
    }

    return (
      <MessagePressResponderContext.Provider
        value={this.messagePressResponderContext}
      >
        <ComposedMessage
          item={item}
          sendFailed={textMessageSendFailed(item)}
          focused={focused}
          swipeOptions={swipeOptions}
          shouldDisplayPinIndicator={shouldDisplayPinIndicator}
          {...viewProps}
        >
          <InnerTextMessage
            item={item}
            onPress={this.onPress}
            messageRef={this.messageRef}
          />
        </ComposedMessage>
      </MessagePressResponderContext.Provider>
    );
  }

  messageRef = (message: ?React.ElementRef<typeof View>) => {
    this.message = message;
  };

  canReply(): boolean {
    return this.props.currentUserIsVoiced;
  }

  canNavigateToSidebar(): boolean {
    return (
      !!this.props.item.threadCreatedFromMessage ||
      this.props.canCreateSidebarFromMessage
    );
  }

  visibleEntryIDs(): $ReadOnlyArray<string> {
    const result = ['copy'];

    if (this.canReply()) {
      result.push('reply');
    }

    if (this.props.canEditMessage) {
      result.push('edit');
    }

    if (this.props.canTogglePins) {
      this.props.item.isPinned ? result.push('unpin') : result.push('pin');
    }

    if (
      this.props.item.threadCreatedFromMessage ||
      this.props.canCreateSidebarFromMessage
    ) {
      result.push('sidebar');
    }

    if (!this.props.item.messageInfo.creator.isViewer) {
      result.push('report');
    }

    if (this.props.canDeleteMessage) {
      result.push('delete');
    }

    return result;
  }

  onPress = () => {
    const visibleEntryIDs = this.visibleEntryIDs();

    const {
      message,
      props: {
        verticalBounds,
        isLinkModalActive,
        isUserProfileBottomSheetActive,
      },
    } = this;

    if (
      !message ||
      !verticalBounds ||
      isLinkModalActive ||
      isUserProfileBottomSheetActive
    ) {
      return;
    }

    const { focused, toggleFocus, item } = this.props;
    if (!focused) {
      toggleFocus(messageKey(item.messageInfo));
    }

    const { overlayContext } = this.props;
    invariant(overlayContext, 'TextMessage should have OverlayContext');
    overlayContext.setScrollBlockingModalStatus('open');

    message.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };

      const messageTop = pageY;
      const messageBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = fixedTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const aboveMargin = isViewer ? 30 : 50;
      const aboveSpace = fixedTooltipHeight + aboveMargin;

      let margin = belowMargin;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        margin = aboveMargin;
      }

      const currentInputBarHeight =
        this.props.chatContext?.chatInputBarHeights.get(item.threadInfo.id) ??
        0;

      this.props.navigation.navigate<'TextMessageTooltipModal'>({
        name: TextMessageTooltipModalRouteName,
        params: {
          presentedFrom: this.props.route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs,
          tooltipLocation: 'fixed',
          margin,
          item,
          chatInputBarHeight: currentInputBarHeight,
        },
        key: getMessageTooltipKey(item),
      });
    });
  };
}

const ConnectedTextMessage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedTextMessage(props: BaseProps) {
    const overlayContext = React.useContext(OverlayContext);
    const chatContext = React.useContext(ChatContext);
    const markdownContext = React.useContext(MarkdownContext);
    invariant(markdownContext, 'markdownContext should be set');

    const {
      linkModalActive,
      userProfileBottomSheetActive,
      clearMarkdownContextData,
    } = markdownContext;

    const key = messageKey(props.item.messageInfo);

    // We check if there is an key in the object - if not, we
    // default to false. The likely situation where the former statement
    // evaluates to null is when the thread is opened for the first time.
    const isLinkModalActive = linkModalActive[key] ?? false;
    const isUserProfileBottomSheetActive =
      userProfileBottomSheetActive[key] ?? false;

    const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
      props.item.threadInfo,
      props.item.messageInfo,
    );

    const messageEditingContext = React.useContext(MessageEditingContext);
    const editMessageID = messageEditingContext?.editState.editedMessage?.id;
    const isThisMessageEdited = editMessageID === props.item.messageInfo.id;

    const canEditMessage =
      useCanEditMessageNative(props.item.threadInfo, props.item.messageInfo) &&
      !isThisMessageEdited;

    React.useEffect(() => clearMarkdownContextData, [clearMarkdownContextData]);

    const currentUserCanReply = useThreadHasPermission(
      props.item.threadInfo,
      threadPermissions.VOICED,
    );

    const canDeleteMessage = useCanDeleteMessage(
      props.item.threadInfo,
      props.item.messageInfo,
    );

    return (
      <TextMessage
        {...props}
        canCreateSidebarFromMessage={canCreateSidebarFromMessage}
        overlayContext={overlayContext}
        chatContext={chatContext}
        isLinkModalActive={isLinkModalActive}
        isUserProfileBottomSheetActive={isUserProfileBottomSheetActive}
        canEditMessage={canEditMessage}
        currentUserIsVoiced={currentUserCanReply}
        canDeleteMessage={canDeleteMessage}
      />
    );
  });

export { ConnectedTextMessage as TextMessage };
