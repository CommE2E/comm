// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
  type LeaveThreadPayload,
} from 'lib/types/thread-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AppState } from '../../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import React from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  View,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import {
  leaveThreadActionTypes,
  leaveThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors';

import Button from '../../components/button.react';

type Props = {|
  threadInfo: ThreadInfo,
  canDeleteThread: bool,
  // Redux state
  loadingStatus: LoadingStatus,
  otherUsersButNoOtherAdmins: bool,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  leaveThread: (threadID: string) => Promise<LeaveThreadPayload>,
|};
class ThreadSettingsLeaveThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    canDeleteThread: PropTypes.bool.isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    otherUsersButNoOtherAdmins: PropTypes.bool.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    leaveThread: PropTypes.func.isRequired,
  };

  render() {
    const loadingIndicator = this.props.loadingStatus === "loading"
      ? <ActivityIndicator size="small" />
      : null;
    const lastButtonStyle = this.props.canDeleteThread
      ? null
      : styles.lastButton;
    return (
      <View style={styles.container}>
        <Button
          onPress={this.onPress}
          style={[styles.button, lastButtonStyle]}
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
    if (this.props.otherUsersButNoOtherAdmins) {
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
    backgroundColor: "white",
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lastButton: {
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 12,
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
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => ({
    loadingStatus: loadingStatusSelector(state),
    otherUsersButNoOtherAdmins:
      otherUsersButNoOtherAdmins(ownProps.threadInfo.id)(state),
  }),
  { leaveThread },
)(ThreadSettingsLeaveThread);
