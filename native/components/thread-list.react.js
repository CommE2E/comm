// @flow

import invariant from 'invariant';
import * as React from 'react';
import { FlatList, TextInput } from 'react-native';
import { createSelector } from 'reselect';

import SearchIndex from 'lib/shared/search-index.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import Search from './search.react.js';
import ThreadListThread from './thread-list-thread.react.js';
import {
  type IndicatorStyle,
  useStyles,
  useIndicatorStyle,
} from '../themes/colors.js';
import type { ViewStyle, TextStyle } from '../types/styles.js';
import { waitForModalInputFocus } from '../utils/timers.js';

type BaseProps = {
  +threadInfos: $ReadOnlyArray<ThreadInfo>,
  +onSelect: (threadID: string) => void,
  +itemStyle?: ViewStyle,
  +itemTextStyle?: TextStyle,
  +searchIndex?: SearchIndex,
};
type Props = {
  ...BaseProps,
  // Redux state
  +styles: typeof unboundStyles,
  +indicatorStyle: IndicatorStyle,
};
type State = {
  +searchText: string,
  +searchResults: Set<string>,
};
type PropsAndState = { ...Props, ...State };
class ThreadList extends React.PureComponent<Props, State> {
  state: State = {
    searchText: '',
    searchResults: new Set(),
  };
  textInput: ?React.ElementRef<typeof TextInput>;

  listDataSelector = createSelector(
    (propsAndState: PropsAndState) => propsAndState.threadInfos,
    (propsAndState: PropsAndState) => propsAndState.searchText,
    (propsAndState: PropsAndState) => propsAndState.searchResults,
    (propsAndState: PropsAndState) => propsAndState.itemStyle,
    (propsAndState: PropsAndState) => propsAndState.itemTextStyle,
    (
      threadInfos: $ReadOnlyArray<ThreadInfo>,
      text: string,
      searchResults: Set<string>,
    ) =>
      text
        ? threadInfos.filter(threadInfo => searchResults.has(threadInfo.id))
        : // We spread to make sure the result of this selector updates when
          // any input param (namely itemStyle or itemTextStyle) changes
          [...threadInfos],
  );

  get listData() {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  render() {
    let searchBar = null;
    if (this.props.searchIndex) {
      searchBar = (
        <Search
          searchText={this.state.searchText}
          onChangeText={this.onChangeSearchText}
          containerStyle={this.props.styles.search}
          placeholder="Search chats"
          ref={this.searchRef}
        />
      );
    }
    return (
      <React.Fragment>
        {searchBar}
        <FlatList
          data={this.listData}
          renderItem={this.renderItem}
          keyExtractor={ThreadList.keyExtractor}
          getItemLayout={ThreadList.getItemLayout}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          indicatorStyle={this.props.indicatorStyle}
        />
      </React.Fragment>
    );
  }

  static keyExtractor = (threadInfo: ThreadInfo) => {
    return threadInfo.id;
  };

  renderItem = (row: { item: ThreadInfo, ... }) => {
    return (
      <ThreadListThread
        threadInfo={row.item}
        onSelect={this.props.onSelect}
        style={this.props.itemStyle}
        textStyle={this.props.itemTextStyle}
      />
    );
  };

  static getItemLayout = (data: ?$ReadOnlyArray<ThreadInfo>, index: number) => {
    return { length: 24, offset: 24 * index, index };
  };

  onChangeSearchText = (searchText: string) => {
    invariant(this.props.searchIndex, 'should be set');
    const results = this.props.searchIndex.getSearchResults(searchText);
    this.setState({ searchText, searchResults: new Set(results) });
  };

  searchRef = async (textInput: ?React.ElementRef<typeof TextInput>) => {
    this.textInput = textInput;
    if (!textInput) {
      return;
    }
    await waitForModalInputFocus();
    if (this.textInput) {
      this.textInput.focus();
    }
  };
}

const unboundStyles = {
  search: {
    marginBottom: 8,
  },
};

const ConnectedThreadList: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadList(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();

    return (
      <ThreadList {...props} styles={styles} indicatorStyle={indicatorStyle} />
    );
  });

export default ConnectedThreadList;
