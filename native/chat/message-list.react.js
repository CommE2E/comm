// @flow

import invariant from 'invariant';
import _find from 'lodash/fp/find.js';
import * as React from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { createSelector } from 'reselect';

import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import { useFetchMessages } from 'lib/shared/message-utils.js';
import { useWatchThread } from 'lib/shared/watch-thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsPersonal } from 'lib/types/thread-types-enum.js';

import ChatList from './chat-list.react.js';
import type { ChatNavigationProp } from './chat.react.js';
import Message from './message.react.js';
import RelationshipPrompt from './relationship-prompt.react.js';
import ListLoadingIndicator from '../components/list-loading-indicator.react.js';
import {
  KeyboardContext,
  type KeyboardState,
} from '../keyboard/keyboard-state.js';
import { defaultStackScreenOptions } from '../navigation/options.js';
import {
  OverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import {
  type IndicatorStyle,
  useIndicatorStyle,
  useStyles,
} from '../themes/colors.js';
import type {
  ChatMessageInfoItemWithHeight,
  ChatMessageItemWithHeight,
} from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';
import type { ViewableItemsChange } from '../types/react-native.js';

const unboundStyles = {
  container: {
    backgroundColor: 'listBackground',
    flex: 1,
  },
  header: {
    height: 12,
  },
  listLoadingIndicator: {
    flex: 1,
  },
};

type BaseProps = {
  +threadInfo: ThreadInfo,
  +messageListData: $ReadOnlyArray<ChatMessageItemWithHeight>,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
};
type Props = {
  ...BaseProps,
  +startReached: boolean,
  +styles: $ReadOnly<typeof unboundStyles>,
  +indicatorStyle: IndicatorStyle,
  +overlayContext: ?OverlayContextType,
  +keyboardState: ?KeyboardState,
  +fetchMessages: () => Promise<mixed>,
};
type State = {
  +focusedMessageKey: ?string,
  +messageListVerticalBounds: ?VerticalBounds,
  +loadingFromScroll: boolean,
};
type PropsAndState = {
  ...Props,
  ...State,
};
type FlatListExtraData = {
  messageListVerticalBounds: ?VerticalBounds,
  focusedMessageKey: ?string,
  navigation: ChatNavigationProp<'MessageList'>,
  route: NavigationRoute<'MessageList'>,
};
class MessageList extends React.PureComponent<Props, State> {
  state: State = {
    focusedMessageKey: null,
    messageListVerticalBounds: null,
    loadingFromScroll: false,
  };
  flatListContainer: ?React.ElementRef<typeof View>;

  flatListExtraDataSelector: PropsAndState => FlatListExtraData =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.messageListVerticalBounds,
      (propsAndState: PropsAndState) => propsAndState.focusedMessageKey,
      (propsAndState: PropsAndState) => propsAndState.navigation,
      (propsAndState: PropsAndState) => propsAndState.route,
      (
        messageListVerticalBounds: ?VerticalBounds,
        focusedMessageKey: ?string,
        navigation: ChatNavigationProp<'MessageList'>,
        route: NavigationRoute<'MessageList'>,
      ) => ({
        messageListVerticalBounds,
        focusedMessageKey,
        navigation,
        route,
      }),
    );

  get flatListExtraData(): FlatListExtraData {
    return this.flatListExtraDataSelector({ ...this.props, ...this.state });
  }

  static getOverlayContext(props: Props): OverlayContextType {
    const { overlayContext } = props;
    invariant(overlayContext, 'MessageList should have OverlayContext');
    return overlayContext;
  }

  static scrollDisabled(props: Props): boolean {
    const overlayContext = MessageList.getOverlayContext(props);
    return overlayContext.scrollBlockingModalStatus !== 'closed';
  }

  static modalOpen(props: Props): boolean {
    const overlayContext = MessageList.getOverlayContext(props);
    return overlayContext.scrollBlockingModalStatus === 'open';
  }

  componentDidUpdate(prevProps: Props) {
    const modalIsOpen = MessageList.modalOpen(this.props);
    const modalWasOpen = MessageList.modalOpen(prevProps);
    if (!modalIsOpen && modalWasOpen) {
      this.setState({ focusedMessageKey: null });
    }

    if (defaultStackScreenOptions.gestureEnabled) {
      const scrollIsDisabled = MessageList.scrollDisabled(this.props);
      const scrollWasDisabled = MessageList.scrollDisabled(prevProps);
      if (!scrollWasDisabled && scrollIsDisabled) {
        this.props.navigation.setOptions({ gestureEnabled: false });
      } else if (scrollWasDisabled && !scrollIsDisabled) {
        this.props.navigation.setOptions({ gestureEnabled: true });
      }
    }
  }

  dismissKeyboard = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };

  renderItem = (row: { item: ChatMessageItemWithHeight, ... }): React.Node => {
    if (row.item.itemType === 'loader') {
      return (
        <TouchableWithoutFeedback onPress={this.dismissKeyboard}>
          <View style={this.props.styles.listLoadingIndicator}>
            <ListLoadingIndicator />
          </View>
        </TouchableWithoutFeedback>
      );
    }
    const messageInfoItem: ChatMessageInfoItemWithHeight = row.item;
    const { messageListVerticalBounds, focusedMessageKey, navigation, route } =
      this.flatListExtraData;
    const focused = chatMessageItemKey(messageInfoItem) === focusedMessageKey;
    return (
      <Message
        item={messageInfoItem}
        focused={focused}
        navigation={navigation}
        route={route}
        toggleFocus={this.toggleMessageFocus}
        verticalBounds={messageListVerticalBounds}
        shouldDisplayPinIndicator={true}
      />
    );
  };

  toggleMessageFocus = (inMessageKey: string) => {
    if (this.state.focusedMessageKey === inMessageKey) {
      this.setState({ focusedMessageKey: null });
    } else {
      this.setState({ focusedMessageKey: inMessageKey });
    }
  };

  // Actually header, it's just that our FlatList is inverted
  ListFooterComponent = (): React.Node => (
    <View style={this.props.styles.header} />
  );

  render(): React.Node {
    const { messageListData, startReached } = this.props;
    const footer = startReached ? this.ListFooterComponent : undefined;
    let relationshipPrompt = null;
    if (threadTypeIsPersonal(this.props.threadInfo.type)) {
      relationshipPrompt = (
        <RelationshipPrompt
          pendingPersonalThreadUserInfo={
            this.props.route.params.pendingPersonalThreadUserInfo
          }
          threadInfo={this.props.threadInfo}
        />
      );
    }
    return (
      <View
        style={this.props.styles.container}
        ref={this.flatListContainerRef}
        onLayout={this.onFlatListContainerLayout}
      >
        {relationshipPrompt}
        <ChatList
          navigation={this.props.navigation}
          inverted={true}
          data={messageListData}
          renderItem={this.renderItem}
          onViewableItemsChanged={this.onViewableItemsChanged}
          ListFooterComponent={footer}
          scrollsToTop={false}
          scrollEnabled={!MessageList.scrollDisabled(this.props)}
          extraData={this.flatListExtraData}
          indicatorStyle={this.props.indicatorStyle}
          keyboardShouldPersistTaps="always"
        />
      </View>
    );
  }

  flatListContainerRef = (
    flatListContainer: ?React.ElementRef<typeof View>,
  ) => {
    this.flatListContainer = flatListContainer;
  };

  onFlatListContainerLayout = () => {
    const { flatListContainer } = this;
    if (!flatListContainer) {
      return;
    }
    flatListContainer.measure((x, y, width, height, pageX, pageY) => {
      if (
        height === null ||
        height === undefined ||
        pageY === null ||
        pageY === undefined
      ) {
        return;
      }
      this.setState({ messageListVerticalBounds: { height, y: pageY } });
    });
  };

  onViewableItemsChanged = (info: ViewableItemsChange) => {
    if (this.state.focusedMessageKey) {
      let focusedMessageVisible = false;
      for (const token of info.viewableItems) {
        if (
          token.item.itemType === 'message' &&
          chatMessageItemKey(token.item) === this.state.focusedMessageKey
        ) {
          focusedMessageVisible = true;
          break;
        }
      }
      if (!focusedMessageVisible) {
        this.setState({ focusedMessageKey: null });
      }
    }

    const loader = _find({ key: 'loader' })(info.viewableItems);
    if (!loader || this.state.loadingFromScroll) {
      return;
    }

    this.setState({ loadingFromScroll: true });

    void (async () => {
      try {
        await this.props.fetchMessages();
      } finally {
        this.setState({ loadingFromScroll: false });
      }
    })();
  };
}

const ConnectedMessageList: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMessageList(props: BaseProps) {
    const keyboardState = React.useContext(KeyboardContext);
    const overlayContext = React.useContext(OverlayContext);

    const threadID = props.threadInfo.id;
    const startReached = useSelector(
      state =>
        !!(
          state.messageStore.threads[threadID] &&
          state.messageStore.threads[threadID].startReached
        ),
    );

    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();

    const fetchMessages = useFetchMessages(props.threadInfo);

    useWatchThread(props.threadInfo);

    return (
      <MessageList
        {...props}
        startReached={startReached}
        styles={styles}
        indicatorStyle={indicatorStyle}
        overlayContext={overlayContext}
        keyboardState={keyboardState}
        fetchMessages={fetchMessages}
      />
    );
  });

export default ConnectedMessageList;
