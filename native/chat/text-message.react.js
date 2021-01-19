// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { messageKey } from 'lib/shared/message-utils';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils';
import { threadHasPermission } from 'lib/shared/thread-utils';
import type { LocalMessageInfo } from 'lib/types/message-types';
import type { TextMessageInfo } from 'lib/types/message/text';
import { type ThreadInfo, threadPermissions } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';

import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state';
import { MarkdownLinkContext } from '../markdown/markdown-link-context';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import type { NavigationRoute } from '../navigation/route-names';
import { TextMessageTooltipModalRouteName } from '../navigation/route-names';
import type { VerticalBounds } from '../types/layout-types';
import type { ChatNavigationProp } from './chat.react';
import { ComposedMessage, clusterEndHeight } from './composed-message.react';
import { failedSendHeight } from './failed-send.react';
import { InnerTextMessage } from './inner-text-message.react';
import { authorNameHeight } from './message-header.react';
import textMessageSendFailed from './text-message-send-failed';
import { textMessageTooltipHeight } from './text-message-tooltip-modal.react';

export type ChatTextMessageInfoItemWithHeight = {|
  itemType: 'message',
  messageShapeType: 'text',
  messageInfo: TextMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
  threadInfo: ThreadInfo,
  startsConversation: boolean,
  startsCluster: boolean,
  endsCluster: boolean,
  contentHeight: number,
|};

function textMessageItemHeight(item: ChatTextMessageInfoItemWithHeight) {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { isViewer } = messageInfo.creator;
  let height = 5 + contentHeight; // 5 from marginBottom in ComposedMessage
  if (!isViewer && startsCluster) {
    height += authorNameHeight;
  }
  if (endsCluster) {
    height += clusterEndHeight;
  }
  if (textMessageSendFailed(item)) {
    height += failedSendHeight;
  }
  return height;
}

type BaseProps = {|
  ...React.ElementConfig<typeof View>,
  +item: ChatTextMessageInfoItemWithHeight,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +messageCreatorUserInfo: UserInfo,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  // withOverlayContext
  +overlayContext: ?OverlayContextType,
  // MarkdownLinkContext
  +linkPressActive: boolean,
|};
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
      keyboardState,
      overlayContext,
      linkPressActive,
      messageCreatorUserInfo,
      ...viewProps
    } = this.props;
    const canSwipe = threadHasPermission(
      item.threadInfo,
      threadPermissions.VOICED,
    );
    return (
      <ComposedMessage
        item={item}
        sendFailed={textMessageSendFailed(item)}
        focused={focused}
        canSwipe={canSwipe}
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

  visibleEntryIDs() {
    const result = ['copy'];

    const canReply = threadHasPermission(
      this.props.item.threadInfo,
      threadPermissions.VOICED,
    );
    const canCreateSidebars = threadHasPermission(
      this.props.item.threadInfo,
      threadPermissions.CREATE_SIDEBARS,
    );

    const creatorRelationship = this.props.messageCreatorUserInfo
      .relationshipStatus;
    const creatorRelationshipHasBlock =
      creatorRelationship &&
      relationshipBlockedInEitherDirection(creatorRelationship);

    if (canReply) {
      result.push('reply');
    }

    if (canCreateSidebars && !creatorRelationshipHasBlock) {
      result.push('sidebar');
    }

    return result;
  }

  onPress = () => {
    if (this.dismissKeyboardIfShowing()) {
      return;
    }

    const {
      message,
      props: { verticalBounds, linkPressActive },
    } = this;
    if (!message || !verticalBounds || linkPressActive) {
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
      const belowSpace = textMessageTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const aboveMargin = isViewer ? 30 : 50;
      const aboveSpace = textMessageTooltipHeight + aboveMargin;

      let location = 'below',
        margin = belowMargin;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      this.props.navigation.navigate({
        name: TextMessageTooltipModalRouteName,
        params: {
          presentedFrom: this.props.route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs: this.visibleEntryIDs(),
          location,
          margin,
          item,
        },
      });
    });
  };

  dismissKeyboardIfShowing = () => {
    const { keyboardState } = this.props;
    return !!(keyboardState && keyboardState.dismissKeyboardIfShowing());
  };
}

const ConnectedTextMessage = React.memo<BaseProps>(
  function ConnectedTextMessage(props: BaseProps) {
    const keyboardState = React.useContext(KeyboardContext);
    const overlayContext = React.useContext(OverlayContext);

    const [linkPressActive, setLinkPressActive] = React.useState(false);
    const markdownLinkContext = React.useMemo(
      () => ({
        setLinkPressActive,
      }),
      [setLinkPressActive],
    );
    const messageCreatorUserInfo = useSelector(
      (state) => state.userStore.userInfos[props.item.messageInfo.creator.id],
    );

    return (
      <MarkdownLinkContext.Provider value={markdownLinkContext}>
        <TextMessage
          {...props}
          messageCreatorUserInfo={messageCreatorUserInfo}
          overlayContext={overlayContext}
          keyboardState={keyboardState}
          linkPressActive={linkPressActive}
        />
      </MarkdownLinkContext.Provider>
    );
  },
);

export { ConnectedTextMessage as TextMessage, textMessageItemHeight };
