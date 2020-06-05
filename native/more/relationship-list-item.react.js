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
  },
  editButton: {
    paddingLeft: 10,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
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
  colors: colorsSelector(state),
  styles: stylesSelector(state),
}))(RelationshipListItem);
