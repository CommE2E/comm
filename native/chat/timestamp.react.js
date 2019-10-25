// @flow

import type { AppState } from '../redux/redux-setup';
import type { Styles } from '../types/styles';

import * as React from 'react';
import { Text } from 'react-native';

import { longAbsoluteDate } from 'lib/utils/date-utils';
import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../themes/colors';

type Props = {|
  time: number,
  contrast: 'high' | 'low',
  // Redux state
  styles: Styles,
|};
function Timestamp(props: Props) {
  const style = props.contrast === 'high'
    ? [ props.styles.timestamp, props.styles.highContrast ]
    : [ props.styles.timestamp, props.styles.lowContrast ];
  return (
    <Text style={style} numberOfLines={1}>
      {longAbsoluteDate(props.time).toUpperCase()}
    </Text>
  );
}

const styles = {
  timestamp: {
    fontSize: 14,
    paddingVertical: 3,
    alignSelf: 'center',
    height: 26,
  },
  lowContrast: {
    color: 'listBackgroundTernaryLabel',
  },
  highContrast: {
    // high contrast framed against LightboxNavigator-dimmed background
    color: 'white',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(Timestamp);
