// @flow

import invariant from 'invariant';
import * as React from 'react';
import { FlatList } from 'react-native';
import { createSelector } from 'reselect';

import SearchIndex from 'lib/shared/search-index.js';
import { reorderThreadSearchResults } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import CommunityListItem from './community-list-item.react.js';
import Search from './search.react.js';
import {
  type IndicatorStyle,
  useIndicatorStyle,
  useStyles,
} from '../themes/colors.js';
import type { TextStyle, ViewStyle } from '../types/styles.js';

const unboundStyles = {
  search: {
    marginBottom: 8,
  },
};

type BaseProps = {
  +threadInfos: $ReadOnlyArray<ThreadInfo>,
  +itemStyle?: ViewStyle,
  +itemTextStyle?: TextStyle,
  +searchIndex?: SearchIndex,
};
type Props = {
  ...BaseProps,
  // Redux state
  +styles: $ReadOnly<typeof unboundStyles>,
  +indicatorStyle: IndicatorStyle,
};
type State = {
  +searchText: string,
  +searchResults: $ReadOnlyArray<ThreadInfo>,
};
type PropsAndState = { ...Props, ...State };
class CommunityList extends React.PureComponent<Props, State> {
  state: State = {
    searchText: '',
    searchResults: [],
  };

  listDataSelector: PropsAndState => $ReadOnlyArray<ThreadInfo> =
    createSelector(
      (propsAndState: PropsAndState) => propsAndState.threadInfos,
      (propsAndState: PropsAndState) => propsAndState.searchText,
      (propsAndState: PropsAndState) => propsAndState.searchResults,
      (propsAndState: PropsAndState) => propsAndState.itemStyle,
      (propsAndState: PropsAndState) => propsAndState.itemTextStyle,
      (
        threadInfos: $ReadOnlyArray<ThreadInfo>,
        text: string,
        searchResults: $ReadOnlyArray<ThreadInfo>,
      ): $ReadOnlyArray<ThreadInfo> =>
        // We spread to make sure the result of this selector updates when
        // any input param (namely itemStyle or itemTextStyle) changes
        text ? [...searchResults] : [...threadInfos],
    );

  get listData(): $ReadOnlyArray<ThreadInfo> {
    return this.listDataSelector({ ...this.props, ...this.state });
  }

  render(): React.Node {
    let searchBar = null;
    if (this.props.searchIndex) {
      searchBar = (
        <Search
          searchText={this.state.searchText}
          onChangeText={this.onChangeSearchText}
          containerStyle={this.props.styles.search}
          placeholder="Search communities"
        />
      );
    }
    return (
      <React.Fragment>
        {searchBar}
        <FlatList
          data={this.listData}
          renderItem={this.renderItem}
          keyExtractor={CommunityList.keyExtractor}
          getItemLayout={CommunityList.getItemLayout}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          indicatorStyle={this.props.indicatorStyle}
        />
      </React.Fragment>
    );
  }

  static keyExtractor = (threadInfo: ThreadInfo): string => {
    return threadInfo.id;
  };

  renderItem = (row: { +item: ThreadInfo, ... }): React.Node => {
    return (
      <CommunityListItem
        threadInfo={row.item}
        style={this.props.itemStyle}
        textStyle={this.props.itemTextStyle}
      />
    );
  };

  static getItemLayout = (
    data: ?$ReadOnlyArray<ThreadInfo>,
    index: number,
  ): { length: number, offset: number, index: number } => {
    return { length: 24, offset: 24 * index, index };
  };

  onChangeSearchText = (searchText: string) => {
    invariant(this.props.searchIndex, 'should be set');
    const results = this.props.searchIndex.getSearchResults(searchText);
    const threadInfoResults = reorderThreadSearchResults(
      this.props.threadInfos,
      results,
    );
    this.setState({ searchText, searchResults: threadInfoResults });
  };
}

const ConnectedCommunityList: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedCommunityList(props: BaseProps) {
    const styles = useStyles(unboundStyles);
    const indicatorStyle = useIndicatorStyle();

    return (
      <CommunityList
        {...props}
        styles={styles}
        indicatorStyle={indicatorStyle}
      />
    );
  });

export default ConnectedCommunityList;
