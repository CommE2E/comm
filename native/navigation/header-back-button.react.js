// @flow

import type { AppState } from '../redux/redux-setup';
import type { Colors } from '../themes/colors';

import * as React from 'react';
import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/stack';

import { connect } from 'lib/utils/redux-utils';

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
