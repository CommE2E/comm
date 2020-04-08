// @flow

import type { AppState } from '../../redux/redux-setup';

import * as React from 'react';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import { connect } from 'lib/utils/redux-utils';

import { styleSelector } from '../../themes/colors';

type Props = {|
  // Redux state
  styles: typeof styles,
|};
function PencilIcon(props: Props) {
  return <Icon name="pencil" size={16} style={props.styles.editIcon} />;
}

const styles = {
  editIcon: {
    color: 'link',
    lineHeight: 20,
    paddingTop: Platform.select({ android: 1, default: 0 }),
    textAlign: 'right',
  },
};
const stylesSelector = styleSelector(styles);

export default connect((state: AppState) => ({
  styles: stylesSelector(state),
}))(PencilIcon);
