// @flow

import React from 'react';
import {
  View,
  Text,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { connect } from 'lib/utils/redux-utils';
import type { LoadingStatus } from 'lib/types/loading-types';
import { type UserInfo } from 'lib/types/user-types';

import type { AppState } from '../redux/redux-setup';
import {
  type KeyboardState,
  withKeyboardState,
} from '../keyboard/keyboard-state';
import {
  withOverlayContext,
  type OverlayContextType,
} from '../navigation/overlay-context';
import { type Colors, colorsSelector, styleSelector } from '../themes/colors';

// TODO: move pencil icon up to components?
import PencilIcon from '../chat/settings/pencil-icon.react';

type Props = {|
  userInfo: UserInfo,
  // Redux state
  removeUserLoadingStatus: LoadingStatus,
  colors: Colors,
  styles: typeof styles,
  // withKeyboardState
  keyboardState: ?KeyboardState,
  // withOverlayContext
  overlayContext: ?OverlayContextType,
|};

type State = {};

class FriendListItem extends React.PureComponent<Props, State> {
  state = {};
  editButton = React.createRef<View>();

  render() {
    let editButton = null;
    if (this.props.removeUserLoadingStatus === 'loading') {
      editButton = (
        <ActivityIndicator
          size="small"
          color={this.props.colors.panelForegroundSecondaryLabel}
        />
      );
    } else {
      editButton = (
        <TouchableOpacity
          onPress={this.onPressEdit}
          style={this.props.styles.editButton}
        >
          <View ref={this.editButton}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={this.props.styles.container}>
        <View style={this.props.styles.innerContainer}>
          <View style={this.props.styles.row}>
            <Text style={this.props.styles.username} numberOfLines={1}>
              {this.props.userInfo.username}
            </Text>
            {editButton}
          </View>
        </View>
      </View>
    );
  }

  onPressEdit = () => {};
}

const styles = {
  container: {
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingHorizontal: 12,
  },
  editButton: {
    paddingLeft: 10,
  },
  innerContainer: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lastInnerContainer: {
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  username: {
    color: 'panelForegroundSecondaryLabel',
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  // TODO: removeUserLoadingStatus
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(withKeyboardState(withOverlayContext(FriendListItem)));
