// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';

import * as React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  borderRadius: number,
  children: React.Node,
|};
class RoundedMessageContainer extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    borderRadius: PropTypes.number.isRequired,
    children: PropTypes.node.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
  };

  render() {
    const { item, borderRadius } = this.props;
    const { isViewer } = item.messageInfo.creator;

    const messageStyle = {
      borderTopRightRadius:
        isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomRightRadius:
        isViewer && !item.endsCluster ? 0 : borderRadius,
      borderTopLeftRadius:
        !isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomLeftRadius:
        !isViewer && !item.endsCluster ? 0 : borderRadius,
    };

    return (
      <View style={[styles.message, messageStyle]}>
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

export default RoundedMessageContainer;
