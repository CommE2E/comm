// @flow

import classNames from 'classnames';
import * as React from 'react';

import { firstLine } from 'lib/utils/string-utils.js';

import css from './single-line.css';

type Props = {
  +children: string,
  +className?: string,
};

function SingleLine(props: Props): React.Node {
  const { children, className } = props;

  const text = firstLine(children);

  const singleLineClassName = classNames([css.singleLine, className]);

  return <div className={singleLineClassName}>{text}</div>;
}

export default SingleLine;
