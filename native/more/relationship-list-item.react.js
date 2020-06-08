// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

import { connect } from 'lib/utils/redux-utils';
import { type UserInfo } from 'lib/types/user-types';

import PencilIcon from '../components/pencil-icon.react';
import { type Colors, colorsSelector, styleSelector } from '../themes/colors';

type Props = {|
  userInfo: UserInfo,
  lastListItem: boolean,
  // Redux state
  removeUserLoadingStatus: LoadingStatus,
  colors: Colors,
  styles: typeof styles,
|};

class RelationshipListItem extends React.PureComponent<Props> {
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
        <TouchableOpacity onPress={this.onPressEdit} style={styles.editButton}>
          <View ref={this.editButton}>
            <PencilIcon />
          </View>
        </TouchableOpacity>
      );
    }

    const borderBottom = this.props.lastListItem ? null : styles.borderBottom;

    return (
      <View style={this.props.styles.container}>
        <View style={[this.props.styles.innerContainer, borderBottom]}>
          <Text style={this.props.styles.username} numberOfLines={1}>
            {this.props.userInfo.username}
          </Text>
          {editButton}
        </View>
      </View>
    );
  }

  onPressEdit = () => {};
}

const styles = {
  editButton: {
    paddingLeft: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'panelForeground',
  },
  innerContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderColor: 'panelForegroundBorder',
    flexDirection: 'row',
  },
  borderBottom: {
    borderBottomWidth: 1,
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
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(RelationshipListItem);
