// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { Navigate } from '../../navigation/route-names';

import * as React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import PropTypes from 'prop-types';
import invariant from 'invariant';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { MessageListRouteName } from '../../navigation/route-names';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: Navigate,
  // Redux state
  parentThreadInfo?: ?ThreadInfo,
|};
class ThreadSettingsParent extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    parentThreadInfo: threadInfoPropType,
  };

  render() {
    let parent;
    if (this.props.parentThreadInfo) {
      parent = (
        <Button onPress={this.onPressParentThread} style={styles.currentValue}>
          <Text
            style={[styles.currentValueText, styles.parentThreadLink]}
            numberOfLines={1}
          >
            {this.props.parentThreadInfo.uiName}
          </Text>
        </Button>
      );
    } else if (this.props.threadInfo.parentThreadID) {
      parent = (
        <Text style={[
          styles.currentValue,
          styles.currentValueText,
          styles.noParent,
        ]}>
          Secret parent
        </Text>
      );
    } else {
      parent = (
        <Text style={[
          styles.currentValue,
          styles.currentValueText,
          styles.noParent,
        ]}>
          No parent
        </Text>
      );
    }
    return (
      <View style={styles.row}>
        <Text style={styles.label}>
          Parent
        </Text>
        {parent}
      </View>
    );
  }

  onPressParentThread = () => {
    const threadInfo = this.props.parentThreadInfo;
    invariant(threadInfo, "should be set");
    this.props.navigate({
      routeName: MessageListRouteName,
      params: { threadInfo },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  }

}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
    paddingVertical: 4,
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingTop: Platform.OS === "ios" ? 5 : 4,
  },
  currentValueText: {
    paddingRight: 0,
    margin: 0,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
  },
  noParent: {
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  parentThreadLink: {
    color: "#036AFF",
  },
});

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const parsedThreadInfos = threadInfoSelector(state);
    const parentThreadInfo: ?ThreadInfo = ownProps.threadInfo.parentThreadID
      ? parsedThreadInfos[ownProps.threadInfo.parentThreadID]
      : null;
    return {
      parentThreadInfo,
    };
  },
)(ThreadSettingsParent);
