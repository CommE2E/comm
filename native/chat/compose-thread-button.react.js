// @flow

import PropTypes from 'prop-types';
import * as React from 'react';
import { StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { createPendingThread } from 'lib/shared/thread-utils';
import { threadTypes } from 'lib/types/thread-types';
import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { MessageListRouteName } from '../navigation/route-names';
import type { AppState } from '../redux/redux-setup';
import { type Colors, colorsPropType, colorsSelector } from '../themes/colors';
import type { ChatNavigationProp } from './chat.react';

type Props = {|
  +navigate: $PropertyType<ChatNavigationProp<'ChatThreadList'>, 'navigate'>,
  // Redux state
  +colors: Colors,
  +viewerID: ?string,
|};
class ComposeThreadButton extends React.PureComponent<Props> {
  static propTypes = {
    navigate: PropTypes.func.isRequired,
    colors: colorsPropType.isRequired,
  };

  render() {
    const { link: linkColor } = this.props.colors;
    return (
      <Button onPress={this.onPress} androidBorderlessRipple={true}>
        <Icon
          name="pencil-plus-outline"
          size={26}
          style={styles.composeButton}
          color={linkColor}
        />
      </Button>
    );
  }

  onPress = () => {
    if (this.props.viewerID) {
      this.props.navigate({
        name: MessageListRouteName,
        params: {
          threadInfo: createPendingThread(
            this.props.viewerID,
            threadTypes.CHAT_SECRET,
            [],
          ),
          searching: true,
        },
      });
    }
  };
}

const styles = StyleSheet.create({
  composeButton: {
    paddingHorizontal: 10,
  },
});

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
  viewerID: state.currentUserInfo && state.currentUserInfo.id,
}))(ComposeThreadButton);
