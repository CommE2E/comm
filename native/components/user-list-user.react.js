// @flow

import type {
  ____TextStyleProp_Internal as TextStyle,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';
import { type UserListItem, userListItemPropType } from 'lib/types/user-types';

import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, Platform } from 'react-native';

import Button from './button.react';

const getUserListItemHeight = (item: UserListItem) => {
  return Platform.OS === "ios" ? 31.5 : 33.5;
};

type Props = {
  userInfo: UserListItem,
  onSelect: (userID: string) => void,
  textStyle?: TextStyle,
};
class UserListUser extends React.PureComponent<Props> {

  static propTypes = {
    userInfo: userListItemPropType.isRequired,
    onSelect: PropTypes.func.isRequired,
    textStyle: Text.propTypes.style,
  };

  render() {
    let parentThreadNotice = null;
    if (!this.props.userInfo.memberOfParentThread) {
      parentThreadNotice = (
        <Text style={styles.parentThreadNotice}>not in parent thread</Text>
      );
    }
    return (
      <Button
        onPress={this.onSelect}
        iosFormat="highlight"
        iosActiveOpacity={0.85}
        style={styles.button}
      >
        <Text style={[styles.text, this.props.textStyle]} numberOfLines={1}>
          {this.props.userInfo.username}
        </Text>
        {parentThreadNotice}
      </Button>
    );
  }

  onSelect = () => {
    this.props.onSelect(this.props.userInfo.id);
  }

}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    color: "black",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
  parentThreadNotice: {
    color: "#888888",
    fontStyle: 'italic',
  },
});


export {
  UserListUser,
  getUserListItemHeight,
};
