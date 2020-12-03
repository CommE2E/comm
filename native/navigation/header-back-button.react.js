// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/stack';
import * as React from 'react';

import { connect } from 'lib/utils/redux-utils';

import type { AppState } from '../redux/redux-setup';
import type { Colors } from '../themes/colors';
import { colorsSelector } from '../themes/colors';

type Props = {
  ...React.ElementConfig<typeof BaseHeaderBackButton>,
  // Redux state
  colors: Colors,
};
function HeaderBackButton(props: Props) {
  if (!props.canGoBack) {
    return null;
  }
  const { colors, ...rest } = props;
  const { link: tintColor } = colors;
  return <BaseHeaderBackButton {...rest} tintColor={tintColor} />;
}

export default connect((state: AppState) => ({
  colors: colorsSelector(state),
}))(HeaderBackButton);
