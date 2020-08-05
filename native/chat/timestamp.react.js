// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';

import { longAbsoluteDate } from 'lib/utils/date-utils';
import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../themes/colors';
import { SingleLine } from '../components/single-line.react';

export type DisplayType = 'lowContrast' | 'modal';

type Props = {|
  time: number,
  display: DisplayType,
  // Redux state
  styles: typeof styles,
|};
function Timestamp(props: Props) {
  const style = [props.styles.timestamp];
  if (props.display === 'modal') {
    style.push(props.styles.modal);
  }
  return (
    <SingleLine style={style}>
      {longAbsoluteDate(props.time).toUpperCase()}
    </SingleLine>
  );
}

const timestampHeight = 26;

const styles = {
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
const stylesSelector = styleSelector(styles);

const WrappedTimestamp = connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(Timestamp);

export { WrappedTimestamp as Timestamp, timestampHeight };
