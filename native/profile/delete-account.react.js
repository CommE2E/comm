// @flow

import * as React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  deleteAccountActionTypes,
  deleteAccount,
} from 'lib/actions/user-actions.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LogOutResult } from 'lib/types/account-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { PreRequestUserState } from 'lib/types/session-types.js';
import type { DispatchActionPromise } from 'lib/utils/action-utils.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import Button from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

type Props = {
  // Redux state
  +loadingStatus: LoadingStatus,
  +preRequestUserState: PreRequestUserState,
  +styles: typeof unboundStyles,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +deleteAccount: (
    preRequestUserState: PreRequestUserState,
  ) => Promise<LogOutResult>,
};
class DeleteAccount extends React.PureComponent<Props> {
  render() {
    const buttonContent =
      this.props.loadingStatus === 'loading' ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text style={this.props.styles.saveText}>Delete account</Text>
      );

    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <View>
          <Text style={this.props.styles.warningText}>
            Your account will be permanently deleted.
          </Text>
        </View>
        <View>
          <Text
            style={[
              this.props.styles.warningText,
              this.props.styles.lastWarningText,
            ]}
          >
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

  submitDeletion = () => {
    this.props.dispatchActionPromise(
      deleteAccountActionTypes,
      this.deleteAccount(),
    );
  };

  async deleteAccount() {
    try {
      await deleteNativeCredentialsFor();
      const result = await this.props.deleteAccount(
        this.props.preRequestUserState,
      );
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          'Incorrect password',
          'The password you entered is incorrect',
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
  lastWarningText: {
    marginBottom: 24,
  },
  saveText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  warningText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    marginHorizontal: 24,
    textAlign: 'center',
  },
};

const loadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

const ConnectedDeleteAccount: React.ComponentType<{ ... }> = React.memo<{
  ...
}>(function ConnectedDeleteAccount() {
  const loadingStatus = useSelector(loadingStatusSelector);
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const styles = useStyles(unboundStyles);

  const dispatchActionPromise = useDispatchActionPromise();
  const callDeleteAccount = useServerCall(deleteAccount);

  return (
    <DeleteAccount
      loadingStatus={loadingStatus}
      preRequestUserState={preRequestUserState}
      styles={styles}
      dispatchActionPromise={dispatchActionPromise}
      deleteAccount={callDeleteAccount}
    />
  );
});

export default ConnectedDeleteAccount;
