// @flow

import type { AppState } from '../../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  type LeaveThreadPayload,
  type RawThreadInfo,
  rawThreadInfoPropType,
} from 'lib/types/thread-types';
import { type GlobalTheme, globalThemePropType } from '../../types/themes';
import type { ChatNavigationProp } from '../chat.react';
import type { NavigationRoute } from '../../navigation/route-names';

import * as React from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  View,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';

import { connect } from 'lib/utils/redux-utils';
import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { identifyInvalidatedThreads } from 'lib/shared/thread-utils';

import Button from '../../components/button.react';
import OnePasswordButton from '../../components/one-password-button.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../../themes/colors';
import {
  withNavContext,
  type NavContextType,
  navContextPropType,
} from '../../navigation/navigation-context';
import { clearThreadsActionType } from '../../navigation/action-types';

export type DeleteThreadParams = {|
  threadInfo: ThreadInfo,
|};

type Props = {|
  navigation: ChatNavigationProp<'DeleteThread'>,
  route: NavigationRoute<'DeleteThread'>,
  // Redux state
  threadInfo: ?ThreadInfo,
  loadingStatus: LoadingStatus,
  activeTheme: ?GlobalTheme,
  colors: Colors,
  styles: typeof styles,
  rawThreadInfos: { [id: string]: RawThreadInfo },
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteThread: (
    threadID: string,
    currentAccountPassword: string,
  ) => Promise<LeaveThreadPayload>,
  // withNavContext
  navContext: ?NavContextType,
|};
type State = {|
  password: string,
  onePasswordSupported: boolean,
|};
class DeleteThread extends React.PureComponent<Props, State> {
  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
      setParams: PropTypes.func.isRequired,
    }).isRequired,
    route: PropTypes.shape({
      params: PropTypes.shape({
        threadInfo: threadInfoPropType.isRequired,
      }).isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType,
    loadingStatus: loadingStatusPropType.isRequired,
    activeTheme: globalThemePropType,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    rawThreadInfos: PropTypes.objectOf(rawThreadInfoPropType).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    deleteThread: PropTypes.func.isRequired,
    navContext: navContextPropType,
  };
  state = {
    password: '',
    onePasswordSupported: false,
  };
  mounted = false;
  passwordInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.determineOnePasswordSupport();
  }

  static getThreadInfo(props: Props): ThreadInfo {
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

  async determineOnePasswordSupport() {
    let onePasswordSupported;
    try {
      onePasswordSupported = await OnePassword.isSupported();
    } catch (e) {
      onePasswordSupported = false;
    }
    this.guardedSetState({ onePasswordSupported });
  }

  render() {
    let onePasswordButton = null;
    if (this.state.onePasswordSupported) {
      const theme = this.props.activeTheme ? this.props.activeTheme : 'light';
      onePasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePassword}
          theme={theme}
          style={this.props.styles.onePasswordButton}
        />
      );
    }
    const buttonContent =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text style={this.props.styles.deleteText}>Delete thread</Text>
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
            {`The thread "${threadInfo.uiName}" will be permanently deleted. `}
            There is no way to reverse this.
          </Text>
        </View>
        <Text style={this.props.styles.header}>PASSWORD</Text>
        <View style={this.props.styles.section}>
          <TextInput
            style={this.props.styles.input}
            underlineColorAndroid="transparent"
            value={this.state.password}
            onChangeText={this.onChangePasswordText}
            placeholder="Password"
            placeholderTextColor={panelForegroundTertiaryLabel}
            secureTextEntry={true}
            returnKeyType="go"
            onSubmitEditing={this.submitDeletion}
            ref={this.passwordInputRef}
          />
          {onePasswordButton}
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

  onChangePasswordText = (newPassword: string) => {
    this.guardedSetState({ password: newPassword });
  };

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'passwordInput should be set');
    this.passwordInput.focus();
  };

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin('https://squadcal.org');
      this.guardedSetState({ password: credentials.password });
    } catch (e) {}
  };

  submitDeletion = () => {
    this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThread(),
    );
  };

  async deleteThread() {
    const threadInfo = DeleteThread.getThreadInfo(this.props);
    const { navContext } = this.props;
    invariant(navContext, 'navContext should exist in deleteThread');
    navContext.dispatch({
      type: clearThreadsActionType,
      payload: { threadIDs: [threadInfo.id] },
    });
    try {
      const result = await this.props.deleteThread(
        threadInfo.id,
        this.state.password,
      );
      const invalidated = identifyInvalidatedThreads(
        this.props.rawThreadInfos,
        result.threadInfos,
      );
      navContext.dispatch({
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

const styles = {
  deleteButton: {
    backgroundColor: 'redButton',
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
  },
  onePasswordButton: {
    marginLeft: 6,
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
const stylesSelector = styleSelector(styles);

const loadingStatusSelector = createLoadingStatusSelector(
  deleteThreadActionTypes,
);

export default connect(
  (
    state: AppState,
    ownProps: {
      route: NavigationRoute<'DeleteThread'>,
    },
  ): * => {
    const threadID = ownProps.route.params.threadInfo.id;
    return {
      threadInfo: threadInfoSelector(state)[threadID],
      loadingStatus: loadingStatusSelector(state),
      activeTheme: state.globalThemeInfo.activeTheme,
      colors: colorsSelector(state),
      styles: stylesSelector(state),
      rawThreadInfos: state.threadStore.threadInfos,
    };
  },
  { deleteThread },
)(withNavContext(DeleteThread));
