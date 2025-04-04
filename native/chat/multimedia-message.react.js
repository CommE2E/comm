// @flow

import type {
  LeafRoute,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/core';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as React from 'react';
import { View } from 'react-native';

import { messageKey } from 'lib/shared/message-utils.js';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils.js';
import { useCanCreateSidebarFromMessage } from 'lib/shared/sidebar-utils.js';
import type { MediaInfo } from 'lib/types/media-types.js';
import { useCanDeleteMessage } from 'lib/utils/delete-message-utils.js';

import { ChatContext, type ChatContextType } from './chat-context.js';
import ComposedMessage from './composed-message.react.js';
import { InnerMultimediaMessage } from './inner-multimedia-message.react.js';
import {
  getMediaKey,
  multimediaMessageSendFailed,
} from './multimedia-message-utils.js';
import { getMessageTooltipKey } from './utils.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import type { OverlayContextType } from '../navigation/overlay-context.js';
import {
  ImageModalRouteName,
  MultimediaMessageTooltipModalRouteName,
  VideoPlaybackModalRouteName,
} from '../navigation/route-names.js';
import { fixedTooltipHeight } from '../tooltip/tooltip.react.js';
import type { ChatMultimediaMessageInfoItem } from '../types/chat-types.js';
import type {
  VerticalBounds,
  LayoutCoordinates,
} from '../types/layout-types.js';

type BaseProps = {
  ...React.ElementConfig<typeof View>,
  +item: ChatMultimediaMessageInfoItem,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
  +canTogglePins: boolean,
  +shouldDisplayPinIndicator: boolean,
};
type Props = {
  ...BaseProps,
  +navigation: NavigationProp<ParamListBase>,
  +route: LeafRoute<>,
  +overlayContext: ?OverlayContextType,
  +chatContext: ?ChatContextType,
  +canCreateSidebarFromMessage: boolean,
  +canCreateReactionFromMessage: boolean,
  +canDeleteMessage: boolean,
};
type State = {
  +clickable: boolean,
};
class MultimediaMessage extends React.PureComponent<Props, State> {
  state: State = {
    clickable: true,
  };
  view: ?React.ElementRef<typeof View>;

  setClickable = (clickable: boolean) => {
    this.setState({ clickable });
  };

  onPressMultimedia = (
    mediaInfo: MediaInfo,
    initialCoordinates: LayoutCoordinates,
  ) => {
    const { navigation, item, route, verticalBounds } = this.props;
    navigation.navigate<'VideoPlaybackModal' | 'ImageModal'>({
      name:
        mediaInfo.type === 'video' || mediaInfo.type === 'encrypted_video'
          ? VideoPlaybackModalRouteName
          : ImageModalRouteName,
      key: getMediaKey(item, mediaInfo),
      params: {
        presentedFrom: route.key,
        mediaInfo,
        item,
        initialCoordinates,
        verticalBounds,
      },
    });
  };

  visibleEntryIDs(): $ReadOnlyArray<string> {
    const result = [];

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

  onLayout = () => {};

  viewRef = (view: ?React.ElementRef<typeof View>) => {
    this.view = view;
  };

  onLongPress = () => {
    const visibleEntryIDs = this.visibleEntryIDs();
    if (
      visibleEntryIDs.length === 0 &&
      !this.props.canCreateReactionFromMessage
    ) {
      return;
    }

    const {
      view,
      props: { verticalBounds },
    } = this;
    if (!view || !verticalBounds) {
      return;
    }

    if (!this.state.clickable) {
      return;
    }
    this.setClickable(false);

    const { item } = this.props;
    if (!this.props.focused) {
      this.props.toggleFocus(messageKey(item.messageInfo));
    }

    this.props.overlayContext?.setScrollBlockingModalStatus('open');

    view.measure((x, y, width, height, pageX, pageY) => {
      const coordinates = { x: pageX, y: pageY, width, height };

      const multimediaTop = pageY;
      const multimediaBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = fixedTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const aboveMargin = isViewer ? 30 : 50;
      const aboveSpace = fixedTooltipHeight + aboveMargin;

      let margin = belowMargin;
      if (
        multimediaBottom + belowSpace > boundsBottom &&
        multimediaTop - aboveSpace > boundsTop
      ) {
        margin = aboveMargin;
      }

      const currentInputBarHeight =
        this.props.chatContext?.chatInputBarHeights.get(item.threadInfo.id) ??
        0;

      this.props.navigation.navigate<'MultimediaMessageTooltipModal'>({
        name: MultimediaMessageTooltipModalRouteName,
        params: {
          presentedFrom: this.props.route.key,
          item,
          initialCoordinates: coordinates,
          verticalBounds,
          tooltipLocation: 'fixed',
          margin,
          visibleEntryIDs,
          chatInputBarHeight: currentInputBarHeight,
        },
        key: getMessageTooltipKey(item),
      });
    });
  };

  canNavigateToSidebar(): boolean {
    return (
      !!this.props.item.threadCreatedFromMessage ||
      this.props.canCreateSidebarFromMessage
    );
  }

  render(): React.Node {
    const {
      item,
      focused,
      toggleFocus,
      verticalBounds,
      shouldDisplayPinIndicator,
      navigation,
      route,
      overlayContext,
      chatContext,
      canCreateSidebarFromMessage,
      canTogglePins,
      canCreateReactionFromMessage,
      canDeleteMessage,
      ...viewProps
    } = this.props;
    return (
      <ComposedMessage
        item={item}
        sendFailed={multimediaMessageSendFailed(item)}
        focused={focused}
        swipeOptions={this.canNavigateToSidebar() ? 'sidebar' : 'none'}
        shouldDisplayPinIndicator={shouldDisplayPinIndicator}
        {...viewProps}
      >
        <View onLayout={this.onLayout} ref={this.viewRef}>
          <InnerMultimediaMessage
            item={item}
            verticalBounds={verticalBounds}
            onPressMultimedia={this.onPressMultimedia}
            clickable={this.state.clickable}
            setClickable={this.setClickable}
            onLongPress={this.onLongPress}
          />
        </View>
      </ComposedMessage>
    );
  }
}

const ConnectedMultimediaMessage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMultimediaMessage(props: BaseProps) {
    const navigation = useNavigation();
    const route = useRoute();
    const overlayContext = React.useContext(OverlayContext);
    const chatContext = React.useContext(ChatContext);
    const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
      props.item.threadInfo,
      props.item.messageInfo,
    );
    const canCreateReactionFromMessage = useCanCreateReactionFromMessage(
      props.item.threadInfo,
      props.item.messageInfo,
    );
    const canDeleteMessage = useCanDeleteMessage(
      props.item.threadInfo,
      props.item.messageInfo,
      !!props.item.threadCreatedFromMessage,
    );
    return (
      <MultimediaMessage
        {...props}
        navigation={navigation}
        route={route}
        overlayContext={overlayContext}
        chatContext={chatContext}
        canCreateSidebarFromMessage={canCreateSidebarFromMessage}
        canCreateReactionFromMessage={canCreateReactionFromMessage}
        canDeleteMessage={canDeleteMessage}
      />
    );
  });

export default ConnectedMultimediaMessage;
