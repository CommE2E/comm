// @flow

import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChangeUserSettingsResult } from 'lib/actions/user-actions';

import React from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native';
import { connect } from 'react-redux';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  changeUserSettingsActionTypes,
  changeUserSettings,
} from 'lib/actions/user-actions';

type Props = {
  // Redux state
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeUserSettings: (
    currentPassword: string,
    newEmail: string,
    newPassword: string,
  ) => Promise<ChangeUserSettingsResult>,
};
class InnerEditPassword extends React.PureComponent<Props> {

  static propTypes = {
    dispatchActionPromise: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Change password",
  };

  render() {
    return (
      <Text>Password</Text>
    );
  }

}

const EditPasswordRouteName = 'EditAccount';
const EditPassword = connect(
  (state: AppState) => ({
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ changeUserSettings }),
)(InnerEditPassword);

export {
  EditPassword,
  EditPasswordRouteName,
};
