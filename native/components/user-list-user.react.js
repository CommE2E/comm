// @flow

import type { TextStyle } from '../types/styles';
import { type UserListItem, userListItemPropType } from 'lib/types/user-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Text, Platform } from 'react-native';

import { connect } from 'lib/utils/redux-utils';

import Button from './button.react';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import { SingleLine } from './single-line.react';

// eslint-disable-next-line no-unused-vars
const getUserListItemHeight = (item: UserListItem) => {
  // TODO consider parent thread notice
  return Platform.OS === 'ios' ? 31.5 : 33.5;
};

type Props = {|
  userInfo: UserListItem,
  onSelect: (userID: string) => void,
  textStyle?: TextStyle,
  // Redux state
  colors: Colors,
  styles: typeof styles,
|};
class UserListUser extends React.PureComponent<Props> {
  static propTypes = {
    userInfo: userListItemPropType.isRequired,
    onSelect: PropTypes.func.isRequired,
    textStyle: Text.propTypes.style,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
  };

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
        <SingleLine style={[this.props.styles.text, this.props.textStyle]}>
          {this.props.userInfo.username}
        </SingleLine>
        {notice}
      </Button>
    );
  }

  onSelect = () => {
    this.props.onSelect(this.props.userInfo.id);
  };
}

const styles = {
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
const stylesSelector = styleSelector(styles);

const WrappedUserListUser = connect((state: AppState) => ({
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(UserListUser);

export { WrappedUserListUser as UserListUser, getUserListItemHeight };
