// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';
import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';

import * as React from 'react';
import { View, Text } from 'react-native';

import { stringForUser } from 'lib/shared/user-utils';
import { connect } from 'lib/utils/redux-utils';

import Timestamp from './timestamp.react';
import { styleSelector } from '../themes/colors';

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  focused: bool,
  contrast: 'high' | 'low',
  // Redux state
  styles: Styles,
|};
function MessageHeader(props: Props) {
  const { item, focused, contrast } = props;
  const { creator, time } = item.messageInfo;
  const { isViewer } = creator;

  let authorName = null;
  if (!isViewer && (item.startsCluster || focused)) {
    const style = contrast === 'high' || !item.startsCluster
      ? [ props.styles.authorName, props.styles.highContrast ]
      : [ props.styles.authorName, props.styles.lowContrast ];
    authorName = (
      <Text style={style} numberOfLines={1}>
        {stringForUser(creator)}
      </Text>
    );
  }

  const timestampContrast = contrast === 'high' || !item.startsConversation
    ? 'high'
    : 'low';
  const timestamp = focused || item.startsConversation
    ? <Timestamp time={time} contrast={timestampContrast} />
    : null;
  if (!timestamp && !authorName) {
    return null;
  }

  const style = !item.startsCluster
    ? props.styles.clusterMargin
    : null;
  return (
    <View style={style}>
      {timestamp}
      {authorName}
    </View>
  );
}

const styles = {
  clusterMargin: {
    marginTop: 7,
  },
  authorName: {
    fontSize: 14,
    marginLeft: 12,
    marginRight: 7,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 25,
  },
  lowContrast: {
    color: 'listBackgroundSecondaryLabel',
  },
  highContrast: {
    // high contrast framed against LightboxNavigator-dimmed background
    color: 'white',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(MessageHeader);
