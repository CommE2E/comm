// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  View,
  TextInput as BaseTextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { identifyInvalidatedThreads } from 'lib/shared/thread-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { ThreadInfo, LeaveThreadPayload } from 'lib/types/thread-types';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react';
import TextInput from '../../components/text-input.react';
import { clearThreadsActionType } from '../../navigation/action-types';
import {
  NavContext,
  type NavAction,
} from '../../navigation/navigation-context';
import type { NavigationRoute } from '../../navigation/route-names';
import { useSelector } from '../../redux/redux-utils';
import { type Colors, useColors, useStyles } from '../../themes/colors';
import type { GlobalTheme } from '../../types/themes';
import type { ChatNavigationProp } from '../chat.react';

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
  +threadInfo: ?ThreadInfo,
  +loadingStatus: LoadingStatus,
  +activeTheme: ?GlobalTheme,
  +colors: Colors,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +deleteThread: (
    threadID: string,
    currentAccountPassword: string,
  ) => Promise<LeaveThreadPayload>,
  // withNavContext
  +navDispatch: (action: NavAction) => void,
};
type State = {
  +password: string,
};
class DeleteThread extends React.PureComponent<Props, State> {
  state: State = {
    password: '',
  };
  mounted = false;
  passwordInput: ?React.ElementRef<typeof BaseTextInput>;

  static getThreadInfo(props: Props): ThreadInfo {
    const { threadInfo } = props;
    if (threadInfo) {
      return threadInfo;
    }
    return props.route.params.threadInfo;
  }

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

  componentDidUpdate(prevProps: Props) {
    const oldReduxThreadInfo = prevProps.threadInfo;
    const newReduxThreadInfo = this.props.threadInfo;
    if (newReduxThreadInfo && newReduxThreadInfo !== oldReduxThreadInfo) {
      this.props.navigation.setParams({ threadInfo: newReduxThreadInfo });
    }
  }

  render() {
    const buttonContent =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text style={this.props.styles.deleteText}>Delete chat</Text>
      );
    const threadInfo = DeleteThread.getThreadInfo(this.props);
    const { panelForegroundTertiaryLabel } = this.props.colors;
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
        <Text style={this.props.styles.header}>PASSWORD</Text>
        <View style={this.props.styles.section}>
          <TextInput
            style={this.props.styles.input}
            value={this.state.password}
            onChangeText={this.onChangePasswordText}
            placeholder="Password"
            placeholderTextColor={panelForegroundTertiaryLabel}
            secureTextEntry={true}
            textContentType="password"
            autoComplete="password"
            returnKeyType="go"
            onSubmitEditing={this.submitDeletion}
            ref={this.passwordInputRef}
          />
        </View>
        <Button
          onPress={this.submitDeletion}
          style={[
            this.props.styles.baseDeleteButton,
            this.state.password === ''
              ? this.props.styles.deleteButtonDisabled
              : this.props.styles.deleteButtonEnabled,
          ]}
          disabled={this.state.password === ''}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangePasswordText = (newPassword: string) => {
    this.guardedSetState({ password: newPassword });
  };

  passwordInputRef = (
    passwordInput: ?React.ElementRef<typeof BaseTextInput>,
  ) => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'passwordInput should be set');
    this.passwordInput.focus();
  };

  submitDeletion = () => {
    if (this.state.password === '') {
      return;
    }

    this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThread(),
    );
  };

  async deleteThread() {
    const threadInfo = DeleteThread.getThreadInfo(this.props);
    const { navDispatch } = this.props;
    navDispatch({
      type: clearThreadsActionType,
      payload: { threadIDs: [threadInfo.id] },
    });
    try {
      const result = await this.props.deleteThread(
        threadInfo.id,
        this.state.password,
      );
      const invalidated = identifyInvalidatedThreads(
        result.updatesResult.newUpdates,
      );
      navDispatch({
        type: clearThreadsActionType,
        payload: { threadIDs: [...invalidated] },
      });
      return result;
    } catch (e) {
      if (
        e.message === 'invalid_credentials' ||
        e.message === 'invalid_parameters'
      ) {
        Alert.alert(
          'Incorrect password',
          'The password you entered is incorrect',
          [{ text: 'OK', onPress: this.onErrorAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: this.onErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
    }
  }

  onErrorAlertAcknowledged = () => {
    this.guardedSetState({ password: '' }, this.focusPasswordInput);
  };
}

const unboundStyles = {
  baseDeleteButton: {
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 12,
  },
  deleteButtonEnabled: {
    backgroundColor: 'redButton',
  },
  deleteButtonDisabled: {
    backgroundColor: 'disabledButton',
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

const ConnectedDeleteThread: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedDeleteThread(props: BaseProps) {
    const threadID = props.route.params.threadInfo.id;
    const threadInfo = useSelector(
      state => threadInfoSelector(state)[threadID],
    );

    const loadingStatus = useSelector(loadingStatusSelector);
    const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);

    const colors = useColors();
    const styles = useStyles(unboundStyles);

    const dispatchActionPromise = useDispatchActionPromise();
    const callDeleteThread = useServerCall(deleteThread);

    const navContext = React.useContext(NavContext);
    invariant(navContext, 'NavContext should be set in DeleteThread');
    const navDispatch = navContext.dispatch;

    return (
      <DeleteThread
        {...props}
        threadInfo={threadInfo}
        loadingStatus={loadingStatus}
        activeTheme={activeTheme}
        colors={colors}
        styles={styles}
        dispatchActionPromise={dispatchActionPromise}
        deleteThread={callDeleteThread}
        navDispatch={navDispatch}
      />
    );
  },
);

export default ConnectedDeleteThread;
