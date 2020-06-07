// @flow

import type {
  Props as FlatListProps,
  DefaultProps as FlatListDefaultProps,
} from 'react-native/Libraries/Lists/FlatList';

import * as React from 'react';
import { FlatList, LayoutAnimation } from 'react-native';
import invariant from 'invariant';

type Props<T> = {
  ...React.Config<FlatListProps<T>, FlatListDefaultProps>,
  loadingFromScroll: boolean,
};
type State = {|
  pendingScrollAppend: boolean,
|};
class ChatList<T> extends React.PureComponent<Props<T>, State> {
  scrollPos = 0;
  scrollHeight: ?number;
  flatList: ?React.ElementRef<typeof FlatList>;

  constructor(props: Props<T>) {
    super(props);
    this.state = {
      pendingScrollAppend: props.loadingFromScroll,
    };
  }

  componentDidUpdate(prevProps: Props<T>) {
    if (this.props.loadingFromScroll && !prevProps.loadingFromScroll) {
      this.setState({ pendingScrollAppend: true });
    }

    const itemsAdded =
      this.props.data &&
      (!prevProps.data || this.props.data.length > prevProps.data.length);
    if (itemsAdded && !this.state.pendingScrollAppend && this.scrollPos <= 0) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    const { loadingFromScroll, ...rest } = this.props;
    return (
      <FlatList
        {...rest}
        ref={this.flatListRef}
        onScroll={this.onScroll}
        onContentSizeChange={this.onContentSizeChange}
      />
    );
  }

  flatListRef = (flatList: ?React.ElementRef<typeof FlatList>) => {
    this.flatList = flatList;
  };

  onScroll = (event: {
    nativeEvent: {
      contentOffset: { y: number },
      contentSize: { height: number },
    },
  }) => {
    this.scrollPos = event.nativeEvent.contentOffset.y;
    this.adjustScrollPos(event.nativeEvent.contentSize.height);
    // $FlowFixMe FlatList doesn't type ScrollView props
    this.props.onScroll && this.props.onScroll(event);
  };

  onContentSizeChange = (contentWidth: number, contentHeight: number) => {
    this.adjustScrollPos(contentHeight);
    // $FlowFixMe FlatList doesn't type ScrollView props
    this.props.onContentSizeChange &&
      this.props.onContentSizeChange(contentWidth, contentHeight);
  };

  adjustScrollPos(scrollHeight: number) {
    const oldScrollHeight = this.scrollHeight;
    this.scrollHeight = scrollHeight;
    if (
      oldScrollHeight === null ||
      oldScrollHeight === undefined ||
      scrollHeight === oldScrollHeight ||
      this.scrollPos <= 0
    ) {
      return;
    }

    if (this.state.pendingScrollAppend) {
      this.setState({ pendingScrollAppend: false });
      return;
    }

    const { flatList } = this;
    invariant(flatList, 'should be set');

    const change = scrollHeight - oldScrollHeight;
    const newPos = this.scrollPos + change;
    flatList.scrollToOffset({ offset: newPos, animated: false });
  }

  get scrolledToBottom() {
    const { scrollPos } = this;
    return scrollPos === null || scrollPos === undefined || scrollPos <= 0;
  }
}

export default ChatList;
