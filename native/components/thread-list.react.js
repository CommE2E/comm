// @flow

import type { ViewStyle, TextStyle } from '../types/styles';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { FlatList, ViewPropTypes, Text } from 'react-native';
import invariant from 'invariant';
import { createSelector } from 'reselect';

import SearchIndex from 'lib/shared/search-index';
import { connect } from 'lib/utils/redux-utils';

import ThreadListThread from './thread-list-thread.react';
import { styleSelector } from '../themes/colors';
import Search from './search.react';

type Props = {|
  threadInfos: $ReadOnlyArray<ThreadInfo>,
  onSelect: (threadID: string) => void,
  itemStyle?: ViewStyle,
  itemTextStyle?: TextStyle,
  searchIndex?: SearchIndex,
  // Redux state
  styles: typeof styles,
|};
type State = {|
  searchText: string,
  searchResults: Set<string>,
|};
type PropsAndState = {| ...Props, ...State |};
class ThreadList extends React.PureComponent<Props, State> {
  static propTypes = {
    threadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    onSelect: PropTypes.func.isRequired,
    itemStyle: ViewPropTypes.style,
    itemTextStyle: Text.propTypes.style,
    searchIndex: PropTypes.instanceOf(SearchIndex),
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };
  state = {
    searchText: '',
    searchResults: new Set(),
  };

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
          placeholder="Search threads"
          autoFocus={true}
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
        />
      </React.Fragment>
    );
  }

  static keyExtractor(threadInfo: ThreadInfo) {
    return threadInfo.id;
  }

  renderItem = (row: { item: ThreadInfo }) => {
    return (
      <ThreadListThread
        threadInfo={row.item}
        onSelect={this.props.onSelect}
        style={this.props.itemStyle}
        textStyle={this.props.itemTextStyle}
      />
    );
  };

  static getItemLayout(data: ?$ReadOnlyArray<ThreadInfo>, index: number) {
    return { length: 24, offset: 24 * index, index };
  }

  onChangeSearchText = (searchText: string) => {
    invariant(this.props.searchIndex, 'should be set');
    const results = this.props.searchIndex.getSearchResults(searchText);
    this.setState({ searchText, searchResults: new Set(results) });
  };
}

const styles = {
  search: {
    marginBottom: 8,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(ThreadList);
