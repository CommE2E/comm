// @flow

import invariant from 'invariant';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import uuid from 'uuid';

import { leaveThreadActionTypes } from 'lib/actions/thread-actions.js';
import { useLeaveThread } from 'lib/hooks/thread-hooks.js';
import type { LeaveThreadInput } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from 'lib/shared/dm-ops/dm-op-types.js';
import { useProcessAndSendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import { identifyInvalidatedThreads } from 'lib/shared/thread-utils.js';
import type { DMLeaveThreadOperation } from 'lib/types/dm-ops';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from 'lib/types/thread-types-enum.js';
import type { LeaveThreadPayload } from 'lib/types/thread-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';

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
  // Redux state
  +loadingStatus: LoadingStatus,
  +otherUsersButNoOtherAdmins: boolean,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +leaveThread: (input: LeaveThreadInput) => Promise<LeaveThreadPayload>,
  +leaveDMThread: () => Promise<void>,
  // withNavContext
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

  onConfirmLeaveThread = () => {
    const threadID = this.props.threadInfo.id;

    if (threadTypeIsThick(this.props.threadInfo.type)) {
      const { navContext } = this.props;
      invariant(navContext, 'navContext should exist in leaveThread');
      navContext.dispatch({
        type: clearThreadsActionType,
        payload: { threadIDs: [threadID] },
      });
      void this.props.leaveDMThread();
    } else {
      void this.props.dispatchActionPromise(
        leaveThreadActionTypes,
        this.leaveThread(),
        {
          customKeyName: `${leaveThreadActionTypes.started}:${threadID}`,
        },
      );
    }
  };

  async leaveThread(): Promise<LeaveThreadPayload> {
    const threadID = this.props.threadInfo.id;
    const { navContext } = this.props;
    invariant(navContext, 'navContext should exist in leaveThread');
    navContext.dispatch({
      type: clearThreadsActionType,
      payload: { threadIDs: [threadID] },
    });
    try {
      const result = await this.props.leaveThread({ threadID });
      const invalidated = identifyInvalidatedThreads(
        result.updatesResult.newUpdates,
      );
      navContext.dispatch({
        type: clearThreadsActionType,
        payload: { threadIDs: [...invalidated] },
      });
      return result;
    } catch (e) {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
        undefined,
        {
          cancelable: true,
        },
      );
      throw e;
    }
  }
}

const ConnectedThreadSettingsLeaveThread: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedThreadSettingsLeaveThread(
    props: BaseProps,
  ) {
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
    const dispatchActionPromise = useDispatchActionPromise();
    const callLeaveThread = useLeaveThread();
    const navContext = React.useContext(NavContext);
    const processAndSendDMOperation = useProcessAndSendDMOperation();
    const viewerID = useSelector(
      state => state.currentUserInfo && state.currentUserInfo.id,
    );

    const leaveDMThread = React.useCallback(async () => {
      invariant(viewerID, 'viewerID should be set');
      const op: DMLeaveThreadOperation = {
        type: 'leave_thread',
        editorID: viewerID,
        time: Date.now(),
        messageID: uuid.v4(),
        threadID: props.threadInfo.id,
      };
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'all_thread_members',
          threadID:
            props.threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            props.threadInfo.parentThreadID
              ? props.threadInfo.parentThreadID
              : props.threadInfo.id,
        },
      };
      await processAndSendDMOperation(opSpecification);
    }, [
      processAndSendDMOperation,
      props.threadInfo.id,
      props.threadInfo.parentThreadID,
      props.threadInfo.type,
      viewerID,
    ]);

    return (
      <ThreadSettingsLeaveThread
        {...props}
        loadingStatus={loadingStatus}
        otherUsersButNoOtherAdmins={otherUsersButNoOtherAdminsValue}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        leaveThread={callLeaveThread}
        navContext={navContext}
        leaveDMThread={leaveDMThread}
      />
    );
  });

export default ConnectedThreadSettingsLeaveThread;
