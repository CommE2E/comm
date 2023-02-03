// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { SingleLine } from '../components/single-line.react';
import { useStyles } from '../themes/colors';
import type { ViewStyle } from '../types/styles';
import {
  TooltipContext,
  type RegisterOptionInput,
} from './tooltip-context.react';

type Props = {
  ...RegisterOptionInput,
  +containerStyle?: ViewStyle,
};
function TooltipItem(props: Props): React.Node {
  const tooltipContext = React.useContext(TooltipContext);
  invariant(tooltipContext, 'TooltipContext should be set in TooltipItem');
  const { registerOption, unregisterOption } = tooltipContext;

  const { containerStyle, ...contextRegistrationInput } = props;
  const { shouldRender } = registerOption(contextRegistrationInput);

  const { id, text, renderIcon, onPress } = props;

  React.useEffect(() => {
    return () => unregisterOption(id);
  }, [unregisterOption, id]);

  const styles = useStyles(unboundStyles);

  if (!shouldRender) {
    return null;
  }

  const icon = renderIcon ? renderIcon(styles.icon) : null;

  return (
    <TouchableOpacity onPress={onPress} style={containerStyle}>
      {icon}
      <SingleLine style={styles.label}>{text}</SingleLine>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  label: {
    color: 'modalForegroundLabel',
    fontSize: 14,
    lineHeight: 17,
    textAlign: 'center',
  },
  icon: {
    color: 'modalForegroundLabel',
  },
};

export default TooltipItem;
