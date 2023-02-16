// @flow

import invariant from 'invariant';
import _sum from 'lodash/fp/sum.js';
import * as React from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  FlatList as ReactNativeFlatList,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { localIDPrefix } from 'lib/shared/message-utils.js';

import type { ChatNavigationProp } from './chat.react.js';
import NewMessagesPill from './new-messages-pill.react.js';
import { chatMessageItemHeight, chatMessageItemKey } from './utils.js';
import {
  type KeyboardState,
  KeyboardContext,
} from '../keyboard/keyboard-state.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { ChatMessageItemWithHeight } from '../types/chat-types.js';
import type { ScrollEvent } from '../types/react-native.js';
import type { ViewStyle } from '../types/styles.js';

type FlatListElementRef = React.ElementRef<typeof ReactNativeFlatList>;
type FlatListProps = React.ElementConfig<typeof ReactNativeFlatList>;

const animationSpec = {
  duration: 150,
  useNativeDriver: true,
};

type BaseProps = {
  ...FlatListProps,
  +navigation: ChatNavigationProp<'MessageList'>,
  +data: $ReadOnlyArray<ChatMessageItemWithHeight>,
  ...
};
type Props = {
  ...BaseProps,
  // Redux state
  +viewerID: ?string,
  // withKeyboardState
  +keyboardState: ?KeyboardState,
  ...
};
type State = {
  +newMessageCount: number,
};
class ChatList extends React.PureComponent<Props, State> {
  state: State = {
    newMessageCount: 0,
  };

  flatList: ?FlatListElementRef;
  scrollPos = 0;

  newMessagesPillProgress = new Animated.Value(0);
  newMessagesPillStyle: ViewStyle;

  constructor(props: Props) {
    super(props);
    const sendButtonTranslateY = this.newMessagesPillProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ([10, 0]: number[]), // Flow...
    });
    this.newMessagesPillStyle = {
      opacity: this.newMessagesPillProgress,
      transform: [{ translateY: sendButtonTranslateY }],
    };
  }

  componentDidMount() {
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.getParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.addListener('tabPress', this.onTabPress);
  }

  componentWillUnmount() {
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.getParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.removeListener('tabPress', this.onTabPress);
  }

  onTabPress = () => {
    const { flatList } = this;
    if (!this.props.navigation.isFocused() || !flatList) {
      return;
    }
    if (this.scrollPos > 0) {
      flatList.scrollToOffset({ offset: 0 });
    } else {
      this.props.navigation.popToTop();
    }
  };

  get scrolledToBottom() {
    return this.scrollPos <= 0;
  }

  componentDidUpdate(prevProps: Props) {
    const { flatList } = this;
    if (!flatList || this.props.data === prevProps.data) {
      return;
    }

    if (this.props.data.length < prevProps.data.length) {
      // This should only happen due to MessageStorePruner,
      // which will only prune a thread when it is off-screen
      flatList.scrollToOffset({ offset: 0, animated: false });
      return;
    }

    const { scrollPos } = this;

    let curDataIndex = 0,
      prevDataIndex = 0,
      heightSoFar = 0;
    let adjustScrollPos = 0,
      newLocalMessage = false,
      newRemoteMessageCount = 0;
    while (prevDataIndex < prevProps.data.length && heightSoFar <= scrollPos) {
      const prevItem = prevProps.data[prevDataIndex];
      invariant(prevItem, 'prevItem should exist');
      const prevItemKey = chatMessageItemKey(prevItem);
      const prevItemHeight = chatMessageItemHeight(prevItem);

      let curItem = this.props.data[curDataIndex];
      while (curItem) {
        const curItemKey = chatMessageItemKey(curItem);
        if (curItemKey === prevItemKey) {
          break;
        }

        if (curItemKey.startsWith(localIDPrefix)) {
          newLocalMessage = true;
        } else if (
          curItem.itemType === 'message' &&
          curItem.messageInfo.creator.id !== this.props.viewerID
        ) {
          newRemoteMessageCount++;
        }
        adjustScrollPos += chatMessageItemHeight(curItem);

        curDataIndex++;
        curItem = this.props.data[curDataIndex];
      }
      if (!curItem) {
        // The only case in which we would expect the length of data to
        // decrease, but find that an item was removed, is if the start
        // of the chat is reached. In that case, the spinner at the top
        // will no longer be rendered. We break here as we expect the
        // spinner to be the last item.
        if (prevItemKey === 'loader') {
          break;
        }
        console.log(
          `items not removed from ChatList, but ${prevItemKey} now missing`,
        );
        return;
      }

      const curItemHeight = chatMessageItemHeight(curItem);
      adjustScrollPos += curItemHeight - prevItemHeight;

      heightSoFar += prevItemHeight;
      prevDataIndex++;
      curDataIndex++;
    }

    if (adjustScrollPos === 0) {
      return;
    }

    flatList.scrollToOffset({
      offset: scrollPos + adjustScrollPos,
      animated: false,
    });

    if (newLocalMessage || scrollPos <= 0) {
      flatList.scrollToOffset({ offset: 0 });
    } else if (newRemoteMessageCount > 0) {
      this.setState(prevState => ({
        newMessageCount: prevState.newMessageCount + newRemoteMessageCount,
      }));
      this.toggleNewMessagesPill(true);
    }
  }

  render() {
    const { navigation, viewerID, ...rest } = this.props;
    const { newMessageCount } = this.state;
    return (
      <TouchableWithoutFeedback onPress={this.onPressBackground}>
        <View style={styles.container}>
          <FlatList
            {...rest}
            keyExtractor={chatMessageItemKey}
            getItemLayout={ChatList.getItemLayout}
            onScroll={this.onScroll}
            ref={this.flatListRef}
          />
          <NewMessagesPill
            onPress={this.onPressNewMessagesPill}
            newMessageCount={newMessageCount}
            pointerEvents={newMessageCount > 0 ? 'auto' : 'none'}
            containerStyle={styles.newMessagesPillContainer}
            style={this.newMessagesPillStyle}
          />
        </View>
      </TouchableWithoutFeedback>
    );
  }

  flatListRef = (flatList: any) => {
    this.flatList = flatList;
  };

  static getItemLayout = (
    data: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
    index: number,
  ) => {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = ChatList.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? chatMessageItemHeight(item) : 0;
    return { length, offset, index };
  };

  static heightOfItems(
    data: $ReadOnlyArray<ChatMessageItemWithHeight>,
  ): number {
    return _sum(data.map(chatMessageItemHeight));
  }

  toggleNewMessagesPill(show: boolean) {
    Animated.timing(this.newMessagesPillProgress, {
      ...animationSpec,
      easing: show ? Easing.ease : Easing.out(Easing.ease),
      toValue: show ? 1 : 0,
    }).start(({ finished }) => {
      if (finished && !show) {
        this.setState({ newMessageCount: 0 });
      }
    });
  }

  onScroll = (event: ScrollEvent) => {
    this.scrollPos = event.nativeEvent.contentOffset.y;
    if (this.scrollPos <= 0) {
      this.toggleNewMessagesPill(false);
    }
    this.props.onScroll && this.props.onScroll(event);
  };

  onPressNewMessagesPill = () => {
    const { flatList } = this;
    if (!flatList) {
      return;
    }
    flatList.scrollToOffset({ offset: 0 });
    this.toggleNewMessagesPill(false);
  };

  onPressBackground = () => {
    const { keyboardState } = this.props;
    keyboardState && keyboardState.dismissKeyboard();
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  newMessagesPillContainer: {
    bottom: 30,
    position: 'absolute',
    right: 30,
  },
});

const ConnectedChatList: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedChatList(props: BaseProps) {
    const keyboardState = React.useContext(KeyboardContext);
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );
    return (
      <ChatList {...props} keyboardState={keyboardState} viewerID={viewerID} />
    );
  },
);

export default ConnectedChatList;
