// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput as BaseTextInput,
  View,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { deleteThreadActionTypes } from 'lib/actions/thread-actions.js';
import { useDeleteThread } from 'lib/hooks/thread-hooks.js';
import type { DeleteThreadInput } from 'lib/hooks/thread-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  containedThreadInfos,
  threadInfoSelector,
} from 'lib/selectors/thread-selectors.js';
import {
  getThreadsToDeleteText,
  identifyInvalidatedThreads,
} from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type {
  ResolvedThreadInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LeaveThreadPayload } from 'lib/types/thread-types.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';

import Button from '../../components/button.react.js';
import { clearThreadsActionType } from '../../navigation/action-types.js';
import {
  type NavAction,
  NavContext,
} from '../../navigation/navigation-context.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../../themes/colors.js';
import { unknownErrorAlertDetails } from '../../utils/alert-messages.js';
import Alert from '../../utils/alert.js';
import type { ChatNavigationProp } from '../chat.react.js';

export type DeleteThreadParams = {
  +threadInfo: ThreadInfo,
};

const unboundStyles = {
  deleteButton: {
    backgroundColor: 'vibrantRedButton',
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 12,
  },
  deleteText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  input: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontFamily: 'Arial',
    fontSize: 16,
    paddingVertical: 0,
    borderBottomColor: 'transparent',
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  warningText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    marginBottom: 24,
    marginHorizontal: 24,
    textAlign: 'center',
  },
};

type BaseProps = {
  +navigation: ChatNavigationProp<'DeleteThread'>,
  +route: NavigationRoute<'DeleteThread'>,
};
type Props = {
  ...BaseProps,
  // Redux state
  +threadInfo: ResolvedThreadInfo,
  +shouldUseDeleteConfirmationAlert: boolean,
  +loadingStatus: LoadingStatus,
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +deleteThread: (input: DeleteThreadInput) => Promise<LeaveThreadPayload>,
  // withNavContext
  +navDispatch: (action: NavAction) => void,
};
class DeleteThread extends React.PureComponent<Props> {
  mounted = false;
  passwordInput: ?React.ElementRef<typeof BaseTextInput>;

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render(): React.Node {
    const buttonContent =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text style={this.props.styles.deleteText}>Delete chat</Text>
      );
    const { threadInfo } = this.props;
    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <View>
          <Text style={this.props.styles.warningText}>
            {`The chat "${threadInfo.uiName}" will be permanently deleted. `}
            There is no way to reverse this.
          </Text>
        </View>
        <Button
          onPress={this.submitDeletion}
          style={this.props.styles.deleteButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  dispatchDeleteThreadAction = () => {
    void this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThread(),
    );
  };

  submitDeletion = () => {
    if (!this.props.shouldUseDeleteConfirmationAlert) {
      this.dispatchDeleteThreadAction();
      return;
    }
    Alert.alert(
      'Warning',
      `${getThreadsToDeleteText(
        this.props.threadInfo,
      )} will also be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: this.dispatchDeleteThreadAction },
      ],
      { cancelable: false },
    );
  };

  async deleteThread(): Promise<LeaveThreadPayload> {
    const { threadInfo, navDispatch } = this.props;
    navDispatch({
      type: clearThreadsActionType,
      payload: { threadIDs: [threadInfo.id] },
    });
    try {
      const result = await this.props.deleteThread({ threadID: threadInfo.id });
      const invalidated = identifyInvalidatedThreads(
        result.updatesResult.newUpdates,
      );
      navDispatch({
        type: clearThreadsActionType,
        payload: { threadIDs: [...invalidated] },
      });
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          'Permission not granted',
          'You do not have permission to delete this thread',
          [{ text: 'OK' }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [{ text: 'OK' }],
          {
            cancelable: false,
          },
        );
      }
      throw e;
    }
  }
}

const loadingStatusSelector = createLoadingStatusSelector(
  deleteThreadActionTypes,
);

const ConnectedDeleteThread: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedDeleteThread(props: BaseProps) {
    const threadID = props.route.params.threadInfo.id;
    const reduxThreadInfo = useSelector(
      state => threadInfoSelector(state)[threadID],
    );
    const reduxContainedThreadInfos = useSelector(
      state => containedThreadInfos(state)[threadID],
    );

    const { setParams } = props.navigation;
    React.useEffect(() => {
      if (reduxThreadInfo) {
        setParams({ threadInfo: reduxThreadInfo });
      }
    }, [reduxThreadInfo, setParams]);
    const threadInfo = reduxThreadInfo ?? props.route.params.threadInfo;
    const resolvedThreadInfo = useResolvedThreadInfo(threadInfo);

    const loadingStatus = useSelector(loadingStatusSelector);

    const colors = useColors();
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callDeleteThread = useDeleteThread();

    const navContext = React.useContext(NavContext);
    invariant(navContext, 'NavContext should be set in DeleteThread');
    const navDispatch = navContext.dispatch;

    const shouldUseDeleteConfirmationAlert =
      reduxContainedThreadInfos && reduxContainedThreadInfos.length > 0;

    return (
      <DeleteThread
        {...props}
        threadInfo={resolvedThreadInfo}
        shouldUseDeleteConfirmationAlert={shouldUseDeleteConfirmationAlert}
        loadingStatus={loadingStatus}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        deleteThread={callDeleteThread}
        navDispatch={navDispatch}
      />
    );
  });

export default ConnectedDeleteThread;
