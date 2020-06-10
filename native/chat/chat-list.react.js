// @flow

import type {
  Props as FlatListProps,
  DefaultProps as FlatListDefaultProps,
} from 'react-native/Libraries/Lists/FlatList';
import type { ChatNavigationProp } from './chat.react';
import type { TabNavigationProp } from '../navigation/app-navigator.react';
import type { ChatMessageItemWithHeight } from './message-list-container.react';

import * as React from 'react';
import { FlatList, LayoutAnimation } from 'react-native';
import invariant from 'invariant';
import _sum from 'lodash/fp/sum';

import { messageKey } from 'lib/shared/message-utils';

import { messageItemHeight } from './message.react';

function chatMessageItemKey(item: ChatMessageItemWithHeight) {
  if (item.itemType === 'loader') {
    return 'loader';
  }
  return messageKey(item.messageInfo);
}

function chatMessageItemHeight(item: ChatMessageItemWithHeight) {
  if (item.itemType === 'loader') {
    return 56;
  }
  return messageItemHeight(item);
}

type Props = {
  ...React.Config<
    FlatListProps<ChatMessageItemWithHeight>,
    FlatListDefaultProps,
  >,
  navigation: ChatNavigationProp<'MessageList'>,
  data: $ReadOnlyArray<ChatMessageItemWithHeight>,
};
class ChatList extends React.PureComponent<Props> {
  scrollPos = 0;
  flatList: ?React.ElementRef<typeof FlatList>;

  componentDidMount() {
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.dangerouslyGetParent();
    invariant(tabNavigation, 'ChatNavigator should be within TabNavigator');
    tabNavigation.addListener('tabPress', this.onTabPress);
  }

  componentWillUnmount() {
    const tabNavigation: ?TabNavigationProp<
      'Chat',
    > = this.props.navigation.dangerouslyGetParent();
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
    const { scrollPos } = this;
    return scrollPos === null || scrollPos === undefined || scrollPos <= 0;
  }

  componentDidUpdate(prevProps: Props) {
    const { flatList } = this;
    if (!flatList || this.props.data.length === prevProps.data.length) {
      return;
    }

    if (this.props.data.length < prevProps.data.length) {
      // This should only happen due to MessageStorePruner,
      // which will only prune a thread when it is off-screen
      flatList.scrollToOffset({ offset: 0, animated: false });
      return;
    }

    const scrollPos = this.scrollPos ? this.scrollPos : 0;

    let curDataIndex = 0,
      prevDataIndex = 0,
      heightSoFar = 0;
    let adjustScrollPos = 0;
    while (prevDataIndex < prevProps.data.length && heightSoFar <= scrollPos) {
      const prevItem = prevProps.data[prevDataIndex];
      invariant(prevItem, 'prevDatum should exist');
      const prevItemKey = chatMessageItemKey(prevItem);
      const prevItemHeight = chatMessageItemHeight(prevItem);

      let curItem = this.props.data[curDataIndex];
      while (curItem && chatMessageItemKey(curItem) !== prevItemKey) {
        adjustScrollPos += chatMessageItemHeight(curItem);
        curDataIndex++;
        curItem = this.props.data[curDataIndex];
      }
      if (!curItem) {
        // Should never happen...
        console.log(`items added to ChatList, but ${prevItemKey} now missing`);
        return;
      }

      const curItemHeight = chatMessageItemHeight(curItem);
      adjustScrollPos += curItemHeight - prevItemHeight;

      heightSoFar += prevItemHeight;
      prevDataIndex++;
      curDataIndex++;
    }

    if (scrollPos <= 0 && adjustScrollPos > 0) {
      // This indicates we're scrolled to the bottom and something just got
      // prepended to the front (bottom) of the chat list. We'll animate it in
      // and we won't adjust scroll position
      LayoutAnimation.easeInEaseOut();
      return;
    }

    flatList.scrollToOffset({
      offset: scrollPos + adjustScrollPos,
      animated: false,
    });
  }

  render() {
    const { navigation, ...rest } = this.props;
    return (
      <FlatList
        {...rest}
        keyExtractor={chatMessageItemKey}
        getItemLayout={ChatList.getItemLayout}
        onScroll={this.onScroll}
        ref={this.flatListRef}
      />
    );
  }

  flatListRef = (flatList: ?React.ElementRef<typeof FlatList>) => {
    this.flatList = flatList;
  };

  static getItemLayout(
    data: ?$ReadOnlyArray<ChatMessageItemWithHeight>,
    index: number,
  ) {
    if (!data) {
      return { length: 0, offset: 0, index };
    }
    const offset = ChatList.heightOfItems(data.filter((_, i) => i < index));
    const item = data[index];
    const length = item ? chatMessageItemHeight(item) : 0;
    return { length, offset, index };
  }

  static heightOfItems(
    data: $ReadOnlyArray<ChatMessageItemWithHeight>,
  ): number {
    return _sum(data.map(chatMessageItemHeight));
  }

  onScroll = (event: {
    nativeEvent: {
      contentOffset: { y: number },
      contentSize: { height: number },
    },
  }) => {
    this.scrollPos = event.nativeEvent.contentOffset.y;
    // $FlowFixMe FlatList doesn't type ScrollView props
    this.props.onScroll && this.props.onScroll(event);
  };
}

export default ChatList;
