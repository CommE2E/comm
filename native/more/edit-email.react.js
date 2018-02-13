// @flow

import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { ChangeUserSettingsResult } from 'lib/actions/user-actions';

import React from 'react';
import PropTypes from 'prop-types';
import { Text } from 'react-native';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-navigation';

import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  changeUserSettingsActionTypes,
  changeUserSettings,
} from 'lib/actions/user-actions';

const forceInset = { top: 'always', bottom: 'never' };

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
class InnerEditEmail extends React.PureComponent<Props> {

  static propTypes = {
    dispatchActionPromise: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
  };

  render() {
    return (
      <SafeAreaView forceInset={forceInset}>
        <Text>Email</Text>
      </SafeAreaView>
    );
  }

}

const EditEmailRouteName = 'EditEmail';
const EditEmail = connect(
  (state: AppState) => ({
    cookie: state.cookie,
  }),
  includeDispatchActionProps,
  bindServerCalls({ changeUserSettings }),
)(InnerEditEmail);

export {
  EditEmail,
  EditEmailRouteName,
};
