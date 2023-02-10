// @flow

import * as React from 'react';

import { longAbsoluteDate } from 'lib/utils/date-utils.js';

import { SingleLine } from '../components/single-line.react.js';
import { useStyles } from '../themes/colors.js';

export type DisplayType = 'lowContrast' | 'modal';

type Props = {
  +time: number,
  +display: DisplayType,
};
function Timestamp(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const style = [styles.timestamp];
  if (props.display === 'modal') {
    style.push(styles.modal);
  }
  return <SingleLine style={style}>{longAbsoluteDate(props.time)}</SingleLine>;
}

const timestampHeight = 26;

const unboundStyles = {
  modal: {
    // high contrast framed against OverlayNavigator-dimmed background
    color: 'white',
  },
  timestamp: {
    alignSelf: 'center',
    bottom: 0,
    color: 'listBackgroundTernaryLabel',
    fontSize: 14,
    height: timestampHeight,
    paddingVertical: 3,
  },
};

export { Timestamp, timestampHeight };
