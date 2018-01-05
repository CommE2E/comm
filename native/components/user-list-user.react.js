// @flow

import type { AccountUserInfo } from 'lib/types/user-types';
import { accountUserInfoPropType } from 'lib/types/user-types';

import React from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
} from 'react-native';

import Button from './button.react';

type Props = {
  userInfo: AccountUserInfo,
  onSelect: (userID: string) => void,
};
class UserListUser extends React.PureComponent<Props> {

  static propTypes = {
    userInfo: accountUserInfoPropType.isRequired,
    onSelect: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Button
        onPress={this.onSelect}
        iosFormat="highlight"
        iosActiveOpacity={0.85}
      >
        <Text style={styles.text}>{this.props.userInfo.username}</Text>
      </Button>
    );
  }

  onSelect = () => {
    this.props.onSelect(this.props.userInfo.id);
  }

}

const styles = StyleSheet.create({
  text: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
});


export default UserListUser;
