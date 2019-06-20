// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { ViewStyle } from '../types/styles';
import type { Corners } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ViewPropTypes } from 'react-native';

const allCorners = {
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
};
function getRoundedContainerStyle(
  item: ChatMessageInfoItemWithHeight,
  corners: Corners,
  borderRadius?: number = 8,
) {
  const { startsCluster, endsCluster } = item;
  const { isViewer } = item.messageInfo.creator;
  const { topLeft, topRight, bottomLeft, bottomRight } = corners;
  return {
    borderTopLeftRadius:
      topLeft && !isViewer && !startsCluster
        ? 0
        : borderRadius,
    borderTopRightRadius:
      topRight && isViewer && !startsCluster
        ? 0
        : borderRadius,
    borderBottomLeftRadius:
      bottomLeft && !isViewer && !endsCluster
        ? 0
        : borderRadius,
    borderBottomRightRadius:
      bottomRight && isViewer && !endsCluster
        ? 0
        : borderRadius,
  };
}

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  borderRadius: number,
  style?: ViewStyle,
  children: React.Node,
|};
class RoundedMessageContainer extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    borderRadius: PropTypes.number.isRequired,
    style: ViewPropTypes.style,
    children: PropTypes.node.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
  };

  render() {
    const { item, borderRadius, style } = this.props;
    const cornerStyle = getRoundedContainerStyle(
      item,
      allCorners,
      borderRadius,
    );
    return (
      <View style={[styles.message, cornerStyle, style]}>
        {this.props.children}
      </View>
    );
  }

}

const styles = StyleSheet.create({
  message: {
    overflow: 'hidden',
  },
});

export {
  allCorners,
  getRoundedContainerStyle,
  RoundedMessageContainer,
};
