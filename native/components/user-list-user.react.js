// @flow

import type { UserInfo } from 'lib/types/user-types';
import { userInfoPropType } from 'lib/types/user-types';

import React from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
} from 'react-native';

import Button from './button.react';

class UserListUser extends React.PureComponent {

  props: {
    userInfo: UserInfo,
    onSelect: (userID: string) => void,
  };
  static propTypes = {
    userInfo: userInfoPropType.isRequired,
    onSelect: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Button onSubmit={this.onSelect} androidBorderlessRipple={false}>
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
