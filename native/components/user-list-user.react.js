// @flow

import * as React from 'react';
import { Text, Platform, Alert } from 'react-native';

import type { UserListItem } from 'lib/types/user-types.js';

import Button from './button.react.js';
import { SingleLine } from './single-line.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import type { TextStyle } from '../types/styles.js';

// eslint-disable-next-line no-unused-vars
const getUserListItemHeight = (item: UserListItem): number => {
  // TODO consider parent thread notice
  return Platform.OS === 'ios' ? 31.5 : 33.5;
};

type BaseProps = {
  +userInfo: UserListItem,
  +onSelect: (userID: string) => void,
  +textStyle?: TextStyle,
};
type Props = {
  ...BaseProps,
  // Redux state
  +colors: Colors,
  +styles: typeof unboundStyles,
};
class UserListUser extends React.PureComponent<Props> {
  render() {
    const { userInfo } = this.props;
    let notice = null;
    if (userInfo.notice) {
      notice = <Text style={this.props.styles.notice}>{userInfo.notice}</Text>;
    }
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;

    return (
      <Button
        onPress={this.onSelect}
        disabled={userInfo.disabled}
        iosFormat="highlight"
        iosHighlightUnderlayColor={underlayColor}
        iosActiveOpacity={0.85}
        style={this.props.styles.button}
      >
        <UserAvatar size="small" userID={this.props.userInfo.id} />
        <SingleLine style={[this.props.styles.text, this.props.textStyle]}>
          {this.props.userInfo.username}
        </SingleLine>
        {notice}
      </Button>
    );
  }

  onSelect = () => {
    const { userInfo } = this.props;
    if (!userInfo.alertText) {
      this.props.onSelect(userInfo.id);
      return;
    }
    Alert.alert(userInfo.alertTitle, userInfo.alertText, [{ text: 'OK' }], {
      cancelable: true,
    });
  };
}

const unboundStyles = {
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notice: {
    color: 'modalForegroundSecondaryLabel',
    fontStyle: 'italic',
  },
  text: {
    color: 'modalForegroundLabel',
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
};

const ConnectedUserListUser: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedUserListUser(props: BaseProps) {
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    return <UserListUser {...props} colors={colors} styles={styles} />;
  });

export { ConnectedUserListUser as UserListUser, getUserListItemHeight };
