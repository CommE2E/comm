// @flow

import type { AppState } from '../../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { NavigationScreenProp, NavigationRoute } from 'react-navigation';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import {
  type ThreadInfo,
  threadInfoPropType,
  type LeaveThreadPayload,
} from 'lib/types/thread-types';

import React from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import _isEqual from 'lodash/fp/isEqual';

import { connect } from 'lib/utils/redux-utils';
import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import Button from '../../components/button.react';
import OnePasswordButton from '../../components/one-password-button.react';

type NavProp =
  & { state: { params: { threadInfo: ThreadInfo } } }
  & NavigationScreenProp<NavigationRoute>;

type Props = {|
  navigation: NavProp,
  // Redux state
  threadInfo: ?ThreadInfo,
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteThread: (
    threadID: string,
    currentAccountPassword: string,
  ) => Promise<LeaveThreadPayload>,
|};
type State = {|
  password: string,
  onePasswordSupported: bool,
|};
class InnerDeleteThread extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      state: PropTypes.shape({
        params: PropTypes.shape({
          threadInfo: threadInfoPropType.isRequired,
        }).isRequired,
      }).isRequired,
      navigate: PropTypes.func.isRequired,
      setParams: PropTypes.func.isRequired,
    }).isRequired,
    threadInfo: threadInfoPropType,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    deleteThread: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Delete thread",
    headerBackTitle: "Back",
  };
  mounted = false;
  passwordInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      password: "",
      onePasswordSupported: false,
    };
    this.determineOnePasswordSupport();
  }

  static getThreadInfo(props: Props): ThreadInfo {
    return props.navigation.state.params.threadInfo;
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  componentWillReceiveProps(nextProps: Props) {
    const newThreadInfo = nextProps.threadInfo;
    if (!newThreadInfo) {
      return;
    }

    const oldThreadInfo = InnerDeleteThread.getThreadInfo(this.props);
    if (!_isEqual(newThreadInfo)(oldThreadInfo)) {
      this.props.navigation.setParams({ threadInfo: newThreadInfo });
    }
  }

  async determineOnePasswordSupport() {
    let onePasswordSupported;
    try {
      onePasswordSupported = await OnePassword.isSupported();
    } catch (e) {
      onePasswordSupported = false;
    }
    if (this.mounted) {
      this.setState({ onePasswordSupported });
    }
  }

  render() {
    let onePasswordButton = null;
    if (this.state.onePasswordSupported) {
      onePasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePassword}
          style={styles.onePasswordButton}
        />
      );
    }
    const buttonContent = this.props.loadingStatus === "loading"
      ? <ActivityIndicator size="small" color="white" />
      : <Text style={styles.saveText}>Delete thread</Text>;
    const threadInfo = InnerDeleteThread.getThreadInfo(this.props);
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View>
          <Text style={styles.warningText}>
            {`The thread "${threadInfo.uiName}" will be permanently deleted. `}
            There is no way to reverse this.
          </Text>
        </View>
        <Text style={styles.header}>PASSWORD</Text>
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            underlineColorAndroid="transparent"
            value={this.state.password}
            onChangeText={this.onChangePasswordText}
            placeholder="Password"
            secureTextEntry={true}
            returnKeyType="go"
            onSubmitEditing={this.submitDeletion}
            ref={this.passwordInputRef}
          />
          {onePasswordButton}
        </View>
        <Button
          onPress={this.submitDeletion}
          style={styles.deleteButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangePasswordText = (newPassword: string) => {
    this.setState({ password: newPassword });
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  focusPasswordInput = () => {
    invariant(this.passwordInput, "passwordInput should be set");
    this.passwordInput.focus();
  }

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState({ password: credentials.password });
    } catch (e) { }
  }

  submitDeletion = () => {
    this.props.dispatchActionPromise(
      deleteThreadActionTypes,
      this.deleteThread(),
    );
  }

  async deleteThread() {
    const threadInfo = InnerDeleteThread.getThreadInfo(this.props);
    try {
      return await this.props.deleteThread(threadInfo.id, this.state.password);
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
    }
  }

  onErrorAlertAcknowledged = () => {
    this.setState(
      { password: "" },
      this.focusPasswordInput,
    );
  }

}

const styles = StyleSheet.create({
  scrollView: {
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: Platform.select({
      ios: 12,
      default: 8,
    }),
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
    paddingVertical: 0,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#BB8888",
    marginVertical: 12,
    marginHorizontal: 24,
    borderRadius: 5,
    padding: 12,
  },
  saveText: {
    fontSize: 18,
    textAlign: 'center',
    color: "white",
  },
  onePasswordButton: {
    marginLeft: 6,
  },
  warningText: {
    marginHorizontal: 24,
    textAlign: 'center',
    color: "#333333",
    fontSize: 16,
    marginBottom: 24,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(
  deleteThreadActionTypes,
);

const DeleteThread = connect(
  (state: AppState, ownProps: { navigation: NavProp }): * => {
    const threadID = ownProps.navigation.state.params.threadInfo.id;
    return {
      threadInfo: threadInfoSelector(state)[threadID],
      loadingStatus: loadingStatusSelector(state),
    };
  },
  { deleteThread },
)(InnerDeleteThread);

export default DeleteThread;
