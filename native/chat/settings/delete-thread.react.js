// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  View,
  TextInput as BaseTextInput,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  threadInfoSelector,
  containedThreadInfos,
} from 'lib/selectors/thread-selectors.js';
import {
  identifyInvalidatedThreads,
  communityOrThreadNoun,
} from 'lib/shared/thread-utils.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { threadTypeIsCommunityRoot } from 'lib/types/thread-types-enum.js';
import type {
  ThreadInfo,
  ResolvedThreadInfo,
  LeaveThreadPayload,
} from 'lib/types/thread-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { useResolvedThreadInfo } from 'lib/utils/entity-helpers.js';

import Button from '../../components/button.react.js';
import { clearThreadsActionType } from '../../navigation/action-types.js';
import {
  NavContext,
  type NavAction,
} from '../../navigation/navigation-context.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../../themes/colors.js';
import type { GlobalTheme } from '../../types/themes.js';
import Alert from '../../utils/alert.js';
import type { ChatNavigationProp } from '../chat.react.js';

export type DeleteThreadParams = {
  +threadInfo: ThreadInfo,
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
  +activeTheme: ?GlobalTheme,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +deleteThread: (threadID: string) => Promise<LeaveThreadPayload>,
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

  guardedSetState(change, callback) {
    if (this.mounted) {
      this.setState(change, callback);
    }
  }

  render() {
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

  passwordInputRef = (
    passwordInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'passwordInput should be set');
    this.passwordInput.focus();
  };

  dispatchDeleteThreadAction = () => {
    this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThread(),
    );
  };

  getThreadsToDeleteText() {
    return `${
      threadTypeIsCommunityRoot(this.props.threadInfo.type)
        ? 'Subchannels and threads'
        : 'Threads'
    } within this ${communityOrThreadNoun(this.props.threadInfo)}`;
  }

  submitDeletion = () => {
    if (!this.props.shouldUseDeleteConfirmationAlert) {
      this.dispatchDeleteThreadAction();
      return;
    }
    Alert.alert(
      'Warning',
      `${this.getThreadsToDeleteText()} will also be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: this.dispatchDeleteThreadAction },
      ],
      { cancelable: false },
    );
  };

  async deleteThread() {
    const { threadInfo, navDispatch } = this.props;
    navDispatch({
      type: clearThreadsActionType,
      payload: { threadIDs: [threadInfo.id] },
    });
    try {
      const result = await this.props.deleteThread(threadInfo.id);
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
        Alert.alert('Unknown error', 'Uhh... try again?', [{ text: 'OK' }], {
          cancelable: false,
        });
      }
      throw e;
    }
  }
}

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
    const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);

    const colors = useColors();
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callDeleteThread = useServerCall(deleteThread);

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
        activeTheme={activeTheme}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        deleteThread={callDeleteThread}
        navDispatch={navDispatch}
      />
    );
  });

export default ConnectedDeleteThread;
