// @flow

import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { leaveThreadActionTypes } from 'lib/actions/thread-action-types.js';
import {
  useLeaveThread,
  type UseLeaveThreadInput,
  type LeaveThreadResult,
} from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import Button from '../../components/button.react.js';
import { clearThreadsActionType } from '../../navigation/action-types.js';
import {
  NavContext,
  type NavContextType,
} from '../../navigation/navigation-context.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../../themes/colors.js';
import type { ViewStyle } from '../../types/styles.js';
import { unknownErrorAlertDetails } from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';

const unboundStyles = {
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  container: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  text: {
    color: 'redText',
    flex: 1,
    fontSize: 16,
  },
};

type BaseProps = {
  +threadInfo: ThreadInfo,
  +buttonStyle: ViewStyle,
};
type Props = {
  ...BaseProps,
  +loadingStatus: LoadingStatus,
  +otherUsersButNoOtherAdmins: boolean,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  +leaveThread: (input: UseLeaveThreadInput) => Promise<LeaveThreadResult>,
  +navContext: ?NavContextType,
};
class ThreadSettingsLeaveThread extends React.PureComponent<Props> {
  render(): React.Node {
    const { panelIosHighlightUnderlay, panelForegroundSecondaryLabel } =
      this.props.colors;
    const loadingIndicator =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color={panelForegroundSecondaryLabel} />
      ) : null;
    return (
      <View style={this.props.styles.container}>
        <Button
          onPress={this.onPress}
          style={[this.props.styles.button, this.props.buttonStyle]}
          iosFormat="highlight"
          iosHighlightUnderlayColor={panelIosHighlightUnderlay}
        >
          <Text style={this.props.styles.text}>Leave chat...</Text>
          {loadingIndicator}
        </Button>
      </View>
    );
  }

  onPress = () => {
    if (this.props.otherUsersButNoOtherAdmins) {
      Alert.alert(
        'Need another admin',
        'Make somebody else an admin before you leave!',
        undefined,
        { cancelable: true },
      );
      return;
    }

    Alert.alert(
      'Confirm action',
      'Are you sure you want to leave this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: this.onConfirmLeaveThread },
      ],
      { cancelable: true },
    );
  };

  onConfirmLeaveThread = async () => {
    const threadID = this.props.threadInfo.id;
    const { navContext } = this.props;
    invariant(navContext, 'navContext should exist in leaveThread');
    navContext.dispatch({
      type: clearThreadsActionType,
      payload: { threadIDs: [threadID] },
    });

    try {
      const result = await this.props.leaveThread({
        threadInfo: this.props.threadInfo,
      });
      if (result.invalidatedThreads.length > 0) {
        navContext.dispatch({
          type: clearThreadsActionType,
          payload: { threadIDs: result.invalidatedThreads },
        });
      }
    } catch (e) {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
        undefined,
        {
          cancelable: true,
        },
      );
    }
  };
}

const ConnectedThreadSettingsLeaveThread: React.ComponentType<BaseProps> =
  React.memo(function ConnectedThreadSettingsLeaveThread(props: BaseProps) {
    const threadID = props.threadInfo.id;
    const loadingStatus = useSelector(
      createLoadingStatusSelector(
        leaveThreadActionTypes,
        `${leaveThreadActionTypes.started}:${threadID}`,
      ),
    );
    const otherUsersButNoOtherAdminsValue = useSelector(
      otherUsersButNoOtherAdmins(props.threadInfo.id),
    );
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const navContext = React.useContext(NavContext);

    const leaveThread = useLeaveThread();

    return (
      <ThreadSettingsLeaveThread
        {...props}
        loadingStatus={loadingStatus}
        otherUsersButNoOtherAdmins={otherUsersButNoOtherAdminsValue}
        colors={colors}
        styles={styles}
        leaveThread={leaveThread}
        navContext={navContext}
      />
    );
  });

export default ConnectedThreadSettingsLeaveThread;
