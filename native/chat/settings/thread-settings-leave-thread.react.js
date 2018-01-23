// @flow

import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';
import {
  threadInfoPropType,
  relativeMemberInfoPropType,
} from 'lib/types/thread-types';
import type { LeaveThreadResult } from 'lib/actions/thread-actions';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
} from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  leaveThreadActionTypes,
  leaveThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../../components/button.react';

type Props = {|
  threadInfo: ThreadInfo,
  threadMembers: RelativeMemberInfo[],
  // Redux state
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  leaveThread: (threadID: string) => Promise<LeaveThreadResult>,
|};
class ThreadSettingsLeaveThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    threadMembers: PropTypes.arrayOf(relativeMemberInfoPropType).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    leaveThread: PropTypes.func.isRequired,
  };

  render() {
    const loadingIndicator = this.props.loadingStatus === "loading"
      ? <ActivityIndicator size="small" />
      : null;
    return (
      <View style={styles.container}>
        <Button
          onPress={this.onPress}
          style={styles.button}
          iosFormat="highlight"
          iosHighlightUnderlayColor="#EEEEEEDD"
        >
          <Text style={styles.text}>Leave thread...</Text>
          {loadingIndicator}
        </Button>
      </View>
    );
  }

  onPress = () => {
    let otherUsersExist = false;
    let otherAdminsExist = false;
    for (let member of this.props.threadMembers) {
      const role = member.role;
      if (role === undefined || role === null || member.isViewer) {
        continue;
      }
      otherUsersExist = true;
      if (this.props.threadInfo.roles[role].name === "Admins") {
        otherAdminsExist = true;
        break;
      }
    }
    if (otherUsersExist && !otherAdminsExist) {
      Alert.alert(
        "Need another admin",
        "Make somebody else an admin before you leave!",
      );
      return;
    }

    Alert.alert(
      "Confirm action",
      "Are you sure you want to leave this thread?",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: this.onConfirmLeaveThread },
      ],
    );
  }

  onConfirmLeaveThread = () => {
    this.props.dispatchActionPromise(
      leaveThreadActionTypes,
      this.leaveThread(),
    );
  }

  async leaveThread() {
    try {
      return await this.props.leaveThread(this.props.threadInfo.id);
    } catch (e) {
      Alert.alert("Unknown error", "Uhh... try again?");
      throw e;
    }
  }

}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "white",
  },
  button: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  text: {
    fontSize: 16,
    color: "#AA0000",
    flex: 1,
  },
});

const loadingStatusSelector
  = createLoadingStatusSelector(leaveThreadActionTypes);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ leaveThread }),
)(ThreadSettingsLeaveThread);
