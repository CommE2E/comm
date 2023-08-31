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
  const style = React.useMemo(
    () =>
      props.display === 'modal'
        ? [styles.timestamp, styles.modal]
        : [styles.timestamp],
    [props.display, styles.modal, styles.timestamp],
  );

  const absoluteDate = React.useMemo(
    () => longAbsoluteDate(props.time),
    [props.time],
  );

  const timestamp = React.useMemo(
    () => <SingleLine style={style}>{absoluteDate}</SingleLine>,
    [absoluteDate, style],
  );

  return timestamp;
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
