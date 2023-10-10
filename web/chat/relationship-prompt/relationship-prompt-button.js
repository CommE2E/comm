// @flow

import { type IconDefinition } from '@fortawesome/fontawesome-common-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import * as React from 'react';

import css from './relationship-prompt.css';
import Button, { type ButtonColor } from '../../components/button.react.js';

type Props = {
  +text: string,
  +icon: IconDefinition,
  +buttonColor: ButtonColor,
  +onClick: () => void,
  +className?: string,
};
function RelationshipPromptButton(props: Props): React.Node {
  const { text, icon, buttonColor, onClick, className } = props;

  const buttonClassName = classnames(css.promptButton, className);

  const relationshipPromptButton = React.useMemo(
    () => (
      <Button
        variant="filled"
        buttonColor={buttonColor}
        onClick={onClick}
        className={buttonClassName}
      >
        <FontAwesomeIcon icon={icon} />
        <p className={css.promptText}>{text}</p>
      </Button>
    ),
    [buttonClassName, buttonColor, icon, onClick, text],
  );

  return relationshipPromptButton;
}

export default RelationshipPromptButton;
