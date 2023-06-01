// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import Button from './button.react.js';
import css from './label.css';

type LabelVariant = 'default' | 'grey';

type Props = {
  +size?: string | number,
  +variant?: LabelVariant,
  +children: React.Node,
  +onClose?: () => mixed,
};

function Label(props: Props): React.Node {
  const { size = '12px', variant = 'default', children, onClose } = props;

  const labelStyle = React.useMemo(
    () => ({
      fontSize: size,
    }),
    [size],
  );

  const labelClassNames = classNames({
    [css.label]: true,
    [css.default]: variant === 'default',
    [css.grey]: variant === 'grey',
  });

  const closeButton = React.useMemo(() => {
    if (!onClose) {
      return null;
    }
    return (
      <Button className={css.close} onClick={onClose}>
        <SWMansionIcon icon="cross" size={size} />
      </Button>
    );
  }, [onClose, size]);

  return (
    <div style={labelStyle} className={labelClassNames}>
      {children}
      {closeButton}
    </div>
  );
}

export default Label;
