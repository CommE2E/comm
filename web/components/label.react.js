// @flow

import * as React from 'react';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './label.css';

type Props = {
  +size?: string | number,
  +color?: string,
  +bg?: string,
  +children: React.Node,
  +onClose?: () => mixed,
};

function Label(props: Props): React.Node {
  const {
    size = '12px',
    color = 'var(--label-default-color)',
    bg = 'var(--label-default-bg)',
    children,
    onClose,
  } = props;

  const labelStyle = React.useMemo(
    () => ({
      fontSize: size,
      color: color,
      background: bg,
    }),
    [bg, color, size],
  );

  const closeButton = React.useMemo(() => {
    if (!onClose) {
      return null;
    }
    return (
      <button className={css.close} onClick={onClose}>
        <SWMansionIcon icon="cross" size={size} />
      </button>
    );
  }, [onClose, size]);

  return (
    <div style={labelStyle} className={css.label}>
      {children}
      {closeButton}
    </div>
  );
}

export default Label;
