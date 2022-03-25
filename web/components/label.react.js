// @flow

import * as React from 'react';

import css from './label.css';

type Props = {
  +size?: string | number,
  +color?: string,
  +bg?: string,
  +children: React.Node,
};

function Label(props: Props): React.Node {
  const {
    size = '12px',
    color = 'var(--label-default-color)',
    bg = 'var(--label-default-bg)',
    children,
  } = props;

  const labelStyle = React.useMemo(
    () => ({
      fontSize: size,
      color: color,
      background: bg,
    }),
    [bg, color, size],
  );

  return (
    <div style={labelStyle} className={css.label}>
      {children}
    </div>
  );
}

export default Label;
