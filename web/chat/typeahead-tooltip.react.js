// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { RelativeMemberInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import type { InputState } from '../input/input-state';
import {
  getTypeaheadTooltipActions,
  getTypeaheadTooltipPosition,
} from '../utils/typeahead-utils';
import type { TypeaheadMatchedStrings } from './chat-input-bar.react';
import css from './typeahead-tooltip.css';

export type TypeaheadTooltipProps = {
  +inputState: InputState,
  +textarea: HTMLTextAreaElement,
  +matchedStrings: TypeaheadMatchedStrings,
  +suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
};

function TypeaheadTooltip(props: TypeaheadTooltipProps): React.Node {
  const { inputState, textarea, matchedStrings, suggestedUsers } = props;

  const { textBeforeAtSymbol, usernamePrefix } = matchedStrings;

  const [isVisibleForAnimation, setIsVisibleForAnimation] = React.useState(
    false,
  );

  React.useEffect(() => {
    setIsVisibleForAnimation(true);

    return () => setIsVisibleForAnimation(false);
  }, []);

  const actions = React.useMemo(
    () =>
      getTypeaheadTooltipActions(
        inputState,
        textarea,
        suggestedUsers,
        textBeforeAtSymbol,
        usernamePrefix,
      ),
    [inputState, textarea, suggestedUsers, textBeforeAtSymbol, usernamePrefix],
  );

  const tooltipPosition = React.useMemo(
    () =>
      getTypeaheadTooltipPosition(textarea, actions.length, textBeforeAtSymbol),
    [textarea, actions.length, textBeforeAtSymbol],
  );

  const tooltipPositionStyle = React.useMemo(
    () => ({
      top: tooltipPosition.top,
      left: tooltipPosition.left,
    }),
    [tooltipPosition],
  );

  const tooltipButtons = React.useMemo(() => {
    return actions.map(({ key, onClick, actionButtonContent }) => (
      <Button key={key} onClick={onClick} className={css.suggestion}>
        <span>@{actionButtonContent}</span>
      </Button>
    ));
  }, [actions]);

  if (!actions || actions.length === 0) {
    return null;
  }

  const overlayClasses = classNames(css.suggestionsContainer, {
    [css.notVisible]: !isVisibleForAnimation,
    [css.visible]: isVisibleForAnimation,
  });

  return (
    <div className={overlayClasses} style={tooltipPositionStyle}>
      {tooltipButtons}
    </div>
  );
}

export default TypeaheadTooltip;
