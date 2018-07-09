// @flow

import type { ViewStyle, TextStyle } from '../types/styles';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  FlatList,
  ViewPropTypes,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';

import SearchIndex from 'lib/shared/search-index';

import ThreadListThread from './thread-list-thread.react';

type Props = {|
  threadInfos: $ReadOnlyArray<ThreadInfo>,
  onSelect: (threadID: string) => void,
  itemStyle?: ViewStyle,
  itemTextStyle?: TextStyle,
  searchIndex?: SearchIndex,
|};
type State = {|
  listData: $ReadOnlyArray<ThreadInfo>,
  searchText: string,
  searchResults: Set<string>,
|};
class ThreadList extends React.PureComponent<Props, State> {

  static propTypes = {
    threadInfos: PropTypes.arrayOf(threadInfoPropType).isRequired,
    onSelect: PropTypes.func.isRequired,
    itemStyle: ViewPropTypes.style,
    itemTextStyle: Text.propTypes.style,
    searchIndex: PropTypes.instanceOf(SearchIndex),
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      listData: [],
      searchText: "",
      searchResults: new Set(),
    };
    this.state.listData = ThreadList.listData(props, this.state);
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.threadInfos !== this.props.threadInfos) {
      this.setState((prevState: State) => ({
        listData: ThreadList.listData(newProps, prevState),
      }));
    }
  }

  componentWillUpdate(nextProps: Props, nextState: State) {
    if (nextState.searchText !== this.state.searchText) {
      this.setState((prevState: State) => ({
        listData: ThreadList.listData(nextProps, nextState),
      }));
    }
  }

  static listData(props: Props, state: State) {
    if (!state.searchText) {
      return props.threadInfos;
    }
    return props.threadInfos.filter(
      threadInfo => state.searchResults.has(threadInfo.id),
    );
  }

  render() {
    let searchBar = null;
    if (this.props.searchIndex) {
      let clearSearchInputIcon = null;
      if (this.state.searchText) {
        clearSearchInputIcon = (
          <TouchableOpacity
            onPress={this.clearSearch}
            activeOpacity={0.5}
          >
            <Icon
              name="times-circle"
              size={18}
              color="#AAAAAA"
            />
          </TouchableOpacity>
        );
      }
      searchBar = (
        <View style={styles.searchContainer}>
          <View style={styles.search}>
            <Icon
              name="search"
              size={18}
              color="#AAAAAA"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              underlineColorAndroid="transparent"
              value={this.state.searchText}
              onChangeText={this.onChangeSearchText}
              placeholder="Search threads"
              placeholderTextColor="#AAAAAA"
              returnKeyType="go"
              autoFocus={true}
            />
            {clearSearchInputIcon}
          </View>
        </View>
      );
    }
    return (
      <React.Fragment>
        {searchBar}
        <FlatList
          data={this.state.listData}
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
  }

  static getItemLayout(data: ?$ReadOnlyArray<ThreadInfo>, index: number) {
    return { length: 24, offset: 24 * index, index };
  }

  onChangeSearchText = (searchText: string) => {
    invariant(this.props.searchIndex, "should be set");
    const results = this.props.searchIndex.getSearchResults(searchText);
    this.setState({ searchText, searchResults: new Set(results) });
  }

  clearSearch = () => {
    this.onChangeSearchText("");
  }

}

const styles = StyleSheet.create({
  searchContainer: {
  },
  searchIcon: {
    paddingBottom: Platform.OS === "android" ? 0 : 2,
  },
  search: {
    backgroundColor: '#DDDDDD',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 14,
    paddingRight: 12,
    paddingTop: Platform.OS === "android" ? 1 : 6,
    paddingBottom: Platform.OS === "android" ? 2 : 6,
    borderRadius: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 0,
    marginVertical: 0,
  },
});

export default ThreadList;
