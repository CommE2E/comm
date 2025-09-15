// @flow

import * as React from 'react';
import { Text, Platform } from 'react-native';

import { protocolNames } from 'lib/shared/protocol-names.js';
import type { UserListItem, AccountUserInfo } from 'lib/types/user-types.js';

import Button from './button.react.js';
import ProtocolIcon from './protocol-icon.react.js';
import SingleLine from './single-line.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import type { TextStyle } from '../types/styles.js';
import Alert from '../utils/alert.js';
import CommLogo from '../vectors/comm-logo.react.js';

// eslint-disable-next-line no-unused-vars
const getUserListItemHeight = (item: UserListItem): number => {
  // TODO consider parent thread notice
  return Platform.OS === 'ios' ? 31.5 : 33.5;
};

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

type BaseProps = {
  +userInfo: UserListItem,
  +onSelect: (user: AccountUserInfo) => mixed,
  +textStyle?: TextStyle,
};
type Props = {
  ...BaseProps,
  // Redux state
  +colors: Colors,
  +styles: $ReadOnly<typeof unboundStyles>,
};
class UserListUser extends React.PureComponent<Props> {
  render(): React.Node {
    const { userInfo } = this.props;
    let notice = null;
    if (userInfo.notice) {
      notice = <Text style={this.props.styles.notice}>{userInfo.notice}</Text>;
    }
    const { modalIosHighlightUnderlay: underlayColor } = this.props.colors;

    let icon = null;
    if (userInfo.supportedProtocols.includes(protocolNames.COMM_DM)) {
      icon = <ProtocolIcon icon={<CommLogo />} size={23} />;
    } else if (
      userInfo.supportedProtocols.includes(protocolNames.FARCASTER_DC)
    ) {
      icon = <ProtocolIcon protocol={protocolNames.FARCASTER_DC} size={23} />;
    }

    return (
      <Button
        onPress={this.onSelect}
        disabled={userInfo.disabled}
        iosFormat="highlight"
        iosHighlightUnderlayColor={underlayColor}
        iosActiveOpacity={0.85}
        style={this.props.styles.button}
      >
        <UserAvatar size="S" userID={this.props.userInfo.id} />
        <SingleLine style={[this.props.styles.text, this.props.textStyle]}>
          {this.props.userInfo.username}
        </SingleLine>
        {notice}
        {icon}
      </Button>
    );
  }

  onSelect = () => {
    const { userInfo } = this.props;
    if (!userInfo.alert) {
      const {
        alert,
        notice,
        disabled,
        supportedProtocols,
        ...accountUserInfo
      } = userInfo;
      this.props.onSelect(accountUserInfo);
      return;
    }
    Alert.alert(userInfo.alert.title, userInfo.alert.text, [{ text: 'OK' }], {
      cancelable: true,
    });
  };
}

const ConnectedUserListUser: React.ComponentType<BaseProps> = React.memo(
  function ConnectedUserListUser(props: BaseProps) {
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    return <UserListUser {...props} colors={colors} styles={styles} />;
  },
);

export { ConnectedUserListUser as UserListUser, getUserListItemHeight };
