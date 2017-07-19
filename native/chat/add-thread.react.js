// @flow

import type {
  NavigationScreenProp,
  NavigationRoute,
  NavigationAction,
} from 'react-navigation';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';
import { userInfoPropType } from 'lib/types/user-types';

import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { connect } from 'react-redux';
import SegmentedControlTab from 'react-native-segmented-control-tab';
import invariant from 'invariant';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  newThreadActionTypes,
  newThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { otherUserInfos, userSearchIndex } from 'lib/selectors/user-selectors';
import SearchIndex from 'lib/shared/search-index';

import TagInput from '../components/tag-input.react';

type NavProp = NavigationScreenProp<NavigationRoute, NavigationAction>;
const segmentedPrivacyOptions = ['Public', 'Secret'];
type TagData = string | {[key: string]: string};

type Props = {
  navigation: NavProp,
  // Redux state
  loadingStatus: LoadingStatus,
  threadInfo: ?ThreadInfo,
  otherUserInfos: {[id: string]: UserInfo},
  userSearchIndex: SearchIndex,
};
class InnerAddThread extends React.PureComponent {

  props: Props;
  state: {
    nameInputText: string,
    usernameInputText: string,
    usernameInputArray: $ReadOnlyArray<string>,
    userSearchResults: $ReadOnlyArray<UserInfo>,
    selectedPrivacyIndex: number,
  };
  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          parentThreadID: PropTypes.string,
        }).isRequired,
      }).isRequired,
    }).isRequired,
    loadingStatus: PropTypes.string.isRequired,
    threadInfo: threadInfoPropType,
    otherUserInfos: PropTypes.objectOf(userInfoPropType).isRequired,
    userSearchIndex: PropTypes.instanceOf(SearchIndex).isRequired,
  };
  static navigationOptions = {
    title: 'New thread',
  };
  nameInput: ?TextInput;

  static getUserSearchResults(
    text: string,
    userInfos: {[id: string]: UserInfo},
    searchIndex: SearchIndex,
  ) {
    const results = [];
    if (text === "") {
      for (let id in userInfos) {
        results.push(userInfos[id]);
      }
    } else {
      const ids = searchIndex.getSearchResults(text);
      for (let id of ids) {
        results.push(userInfos[id]);
      }
    }
    return results;
  }

  constructor(props: Props) {
    super(props);
    const userSearchResults = InnerAddThread.getUserSearchResults(
      "",
      props.otherUserInfos,
      props.userSearchIndex,
    );
    this.state = {
      nameInputText: "",
      usernameInputText: "",
      usernameInputArray: [],
      userSearchResults,
      selectedPrivacyIndex: 0,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      this.props.otherUserInfos !== nextProps.otherUserInfos ||
      this.props.userSearchIndex !== nextProps.userSearchIndex
    ) {
      const userSearchResults = InnerAddThread.getUserSearchResults(
        this.state.usernameInputText,
        nextProps.otherUserInfos,
        nextProps.userSearchIndex,
      );
      this.setState({ userSearchResults });
    }
  }

  render() {
    let visibility;
    if (this.props.threadInfo) {
      visibility = (
        <View style={styles.row}>
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.input}>
            <SegmentedControlTab
              values={segmentedPrivacyOptions}
              selectedIndex={this.state.selectedPrivacyIndex}
              onTabPress={this.handleIndexChange}
              tabStyle={styles.segmentedTabStyle}
              activeTabStyle={styles.segmentedActiveTabStyle}
              tabTextStyle={styles.segmentedTextStyle}
            />
            <Text
              style={styles.parentThreadName}
              numberOfLines={1}
            >
              <Text style={styles.parentThreadNameRobotext}>
                {"within "}
              </Text>
              {this.props.threadInfo.name}
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <View style={styles.input}>
            <TextInput
              style={styles.textInput}
              value={this.state.nameInputText}
              onChangeText={this.onChangeNameInputText}
              placeholder="thread name"
              autoFocus={true}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="ascii-capable"
              returnKeyType="next"
              editable={this.props.loadingStatus !== "loading"}
              underlineColorAndroid="transparent"
              ref={this.nameInputRef}
            />
          </View>
        </View>
        {visibility}
        <View style={styles.row}>
          <Text style={styles.tagInputLabel}>People</Text>
          <View style={styles.input}>
            <TagInput
              onChange={this.onChangeTagInput}
              value={this.state.usernameInputArray}
              text={this.state.usernameInputText}
              setText={this.setUsernameInputText}
            />
          </View>
        </View>
      </View>
    );
  }

  nameInputRef = (nameInput: ?TextInput) => {
    this.nameInput = nameInput;
  }

  onChangeNameInputText = (text: string) => {
    this.setState({ nameInputText: text });
  }

  onChangeTagInput = (usernameInputArray: $ReadOnlyArray<TagData>) => {
    const stringArray: string[] = [];
    for (const tagData of usernameInputArray) {
      invariant(typeof tagData === "string", "AddThread uses string TagData");
      stringArray.push(tagData);
    }
    this.setState({ usernameInputArray: stringArray });
  }

  handleIndexChange = (index: number) => {
    this.setState({ selectedPrivacyIndex: index });
  }

  setUsernameInputText = (text: string) => {
    const userSearchResults = InnerAddThread.getUserSearchResults(
      text,
      this.props.otherUserInfos,
      this.props.userSearchIndex,
    );
    this.setState({ usernameInputText: text, userSearchResults });
  }

}

const styles = StyleSheet.create({
  container: {
    paddingTop: 5,
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 3,
    paddingRight: 12,
  },
  label: {
    paddingTop: 2,
    paddingLeft: 12,
    fontSize: 20,
    flex: 1,
  },
  tagInputLabel: {
    paddingTop: 2,
    paddingLeft: 12,
    fontSize: 20,
    flex: 1,
  },
  textInput: {
    fontSize: 18,
    paddingTop: 4,
    paddingBottom: 0,
    paddingHorizontal: 0,
    margin: 0,
  },
  parentThreadName: {
    paddingTop: 5,
    fontSize: 18,
  },
  parentThreadNameRobotext: {
    color: '#AAAAAA',
  },
  segmentedTabStyle: {
    borderColor: '#777',
  },
  segmentedActiveTabStyle: {
    backgroundColor: '#777',
  },
  segmentedTextStyle: {
    color: '#777',
  },
});

const AddThreadRouteName = 'AddThread';

const loadingStatusSelector
  = createLoadingStatusSelector(newThreadActionTypes);

const AddThread = connect(
  (state: AppState, ownProps: { navigation: NavProp }) => {
    let threadInfo = null;
    const threadID = ownProps.navigation.state.params.parentThreadID;
    if (threadID) {
      threadInfo = state.threadInfos[threadID];
      invariant(threadInfo, "parent thread should exist");
    }
    return {
      loadingStatus: loadingStatusSelector(state),
      threadInfo,
      cookie: state.cookie,
      otherUserInfos: otherUserInfos(state),
      userSearchIndex: userSearchIndex(state),
    };
  },
  includeDispatchActionProps,
  bindServerCalls({ newThread }),
)(InnerAddThread);

export {
  AddThread,
  AddThreadRouteName,
};
