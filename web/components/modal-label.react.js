// @flow

import React from 'React';

import css from './modal-label.css';

type Props = {
  +content: string,
};

const ModalLabel = (props: Props): React.Node => {
  const { content } = props;

  return <div className={css.label}>{content}</div>;
};

export default ModalLabel;
