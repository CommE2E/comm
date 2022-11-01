// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import { messageKey } from 'lib/shared/message-utils';
import {
  threadHasPermission,
  useCanCreateSidebarFromMessage,
} from 'lib/shared/thread-utils';
import { threadPermissions } from 'lib/types/thread-types';

import { ChatContext, type ChatContextType } from '../chat/chat-context';
import { MarkdownContext } from '../markdown/markdown-context';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import type { NavigationRoute } from '../navigation/route-names';
import { TextMessageTooltipModalRouteName } from '../navigation/route-names';
import { fixedTooltipHeight } from '../navigation/tooltip.react';
import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types';
import type { VerticalBounds } from '../types/layout-types';
import type { ChatNavigationProp } from './chat.react';
import ComposedMessage from './composed-message.react';
import { InnerTextMessage } from './inner-text-message.react';
import { MessageContext } from './message-context.react';
import textMessageSendFailed from './text-message-send-failed';
import { getMessageTooltipKey } from './utils';

type BaseProps = {
  ...React.ElementConfig<typeof View>,
  +item: ChatTextMessageInfoItemWithHeight,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
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
  +linkIsBlockingPresses: boolean,
};
class TextMessage extends React.PureComponent<Props> {
  message: ?React.ElementRef<typeof View>;

  render() {
    const {
      item,
      navigation,
      route,
      focused,
      toggleFocus,
      verticalBounds,
      overlayContext,
      chatContext,
      isLinkModalActive,
      linkIsBlockingPresses,
      canCreateSidebarFromMessage,
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
      <ComposedMessage
        item={item}
        sendFailed={textMessageSendFailed(item)}
        focused={focused}
        swipeOptions={swipeOptions}
        {...viewProps}
      >
        <InnerTextMessage
          item={item}
          onPress={this.onPress}
          messageRef={this.messageRef}
        />
      </ComposedMessage>
    );
  }

  messageRef = (message: ?React.ElementRef<typeof View>) => {
    this.message = message;
  };

  canReply() {
    return threadHasPermission(
      this.props.item.threadInfo,
      threadPermissions.VOICED,
    );
  }

  canNavigateToSidebar() {
    return (
      this.props.item.threadCreatedFromMessage ||
      this.props.canCreateSidebarFromMessage
    );
  }

  visibleEntryIDs() {
    const result = ['copy'];

    if (this.canReply()) {
      result.push('reply');
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

    return result;
  }

  onPress = () => {
    const visibleEntryIDs = this.visibleEntryIDs();
    if (visibleEntryIDs.length === 0) {
      return;
    }

    const {
      message,
      props: { verticalBounds, linkIsBlockingPresses },
    } = this;

    if (!message || !verticalBounds || linkIsBlockingPresses) {
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
          location: 'fixed',
          margin,
          item,
          chatInputBarHeight: currentInputBarHeight,
        },
        key: getMessageTooltipKey(item),
      });
    });
  };
}

const ConnectedTextMessage: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedTextMessage(props: BaseProps) {
    const overlayContext = React.useContext(OverlayContext);
    const chatContext = React.useContext(ChatContext);
    const markdownContext = React.useContext(MarkdownContext);
    invariant(markdownContext, 'markdownContext should be set');

    const {
      linkModalActive,
      linkPressActive,
      clearMarkdownContextData,
    } = markdownContext;

    const key = messageKey(props.item.messageInfo);

    // We check if there is an ID in the respective objects - if not, we
    // default to false. The likely situation where the former statement
    // evaluates to null is when the thread is opened for the first time.
    const linkIsBlockingPresses =
      (linkModalActive[key] || linkPressActive[key]) ?? false;

    const isLinkModalActive = linkModalActive[key] ?? false;

    const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
      props.item.threadInfo,
      props.item.messageInfo,
    );

    // We use a MessageContext to allow MarkdownLink and MarkdownSpoiler
    // to access the messageKey so it is 'self-aware'
    const contextValue = React.useMemo(
      () => ({
        messageKey: key,
      }),
      [key],
    );

    React.useEffect(() => clearMarkdownContextData, [clearMarkdownContextData]);

    return (
      <MessageContext.Provider value={contextValue}>
        <TextMessage
          {...props}
          canCreateSidebarFromMessage={canCreateSidebarFromMessage}
          overlayContext={overlayContext}
          chatContext={chatContext}
          isLinkModalActive={isLinkModalActive}
          linkIsBlockingPresses={linkIsBlockingPresses}
        />
      </MessageContext.Provider>
    );
  },
);

export { ConnectedTextMessage as TextMessage };
