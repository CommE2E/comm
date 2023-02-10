// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import { TooltipContext } from './tooltip-context.react.js';
import { SingleLine } from '../components/single-line.react.js';
import { useStyles } from '../themes/colors.js';
import type { ViewStyle, TextStyle } from '../types/styles.js';

export type TooltipItemBaseProps = {
  +id: string,
  +text: string,
  +onPress: () => mixed,
  +renderIcon?: (iconStyle: TextStyle) => React.Node,
  +isDestructive?: boolean,
  +isCancel?: boolean,
};
type Props = {
  ...TooltipItemBaseProps,
  +containerStyle?: ViewStyle,
  +closeTooltip?: () => mixed,
};
function TooltipItem(props: Props): React.Node {
  const tooltipContext = React.useContext(TooltipContext);
  invariant(tooltipContext, 'TooltipContext should be set in TooltipItem');
  const { registerOption, unregisterOption } = tooltipContext;

  const symbolRef = React.useRef(Symbol());

  const { containerStyle, closeTooltip, ...contextRegistrationInput } = props;
  const { shouldRender } = registerOption({
    ...contextRegistrationInput,
    symbol: symbolRef.current,
  });

  const { id, text, renderIcon, onPress: onPressItem } = props;

  React.useEffect(() => {
    return () => unregisterOption(id);
  }, [unregisterOption, id]);

  const styles = useStyles(unboundStyles);

  const onPress = React.useCallback(() => {
    onPressItem();
    closeTooltip?.();
  }, [onPressItem, closeTooltip]);

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
