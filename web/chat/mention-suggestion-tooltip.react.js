// @flow

import * as React from 'react';

import Button from '../components/button.react';
import css from './mention-suggestion-tooltip.css';

export type MentionSuggestionTooltipAction = {
  +key: string,
  +onClick: (SyntheticEvent<HTMLButtonElement>) => mixed,
  +actionButtonContent: React.Node,
};

export type TooltipPosition = {
  +top: number,
  +left: number,
};
export type MentionSuggestionTooltipProps = {
  +actions: $ReadOnlyArray<MentionSuggestionTooltipAction>,
  +tooltipPosition: TooltipPosition,
};

function MentionSuggestionTooltip(
  props: MentionSuggestionTooltipProps,
): React.Node {
  const { actions, tooltipPosition } = props;

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

  return (
    <div className={css.suggestionsContainer} style={tooltipPositionStyle}>
      {tooltipButtons}
    </div>
  );
}

export default MentionSuggestionTooltip;
