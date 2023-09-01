// @flow

import classNames from 'classnames';
import * as React from 'react';

import type {
  TypeaheadMatchedStrings,
  TypeaheadTooltipActionItem,
} from 'lib/shared/mention-utils.js';
import { leastPositiveResidue } from 'lib/utils/math-utils.js';

import css from './typeahead-tooltip.css';
import type { InputState } from '../input/input-state.js';
import type {
  GetTypeaheadTooltipActionsParams,
  GetMentionTypeaheadTooltipButtonsParams,
} from '../utils/typeahead-utils.js';
import {
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipPosition,
} from '../utils/typeahead-utils.js';

export type TypeaheadTooltipProps<SuggestionItemType> = {
  +inputState: InputState,
  +textarea: HTMLTextAreaElement,
  +matchedStrings: TypeaheadMatchedStrings,
  +suggestions: $ReadOnlyArray<SuggestionItemType>,
  +typeaheadTooltipActionsGetter: (
    GetTypeaheadTooltipActionsParams<SuggestionItemType>,
  ) => $ReadOnlyArray<TypeaheadTooltipActionItem<SuggestionItemType>>,
  +typeaheadTooltipButtonsGetter: (
    GetMentionTypeaheadTooltipButtonsParams<SuggestionItemType>,
  ) => React.Node,
};

function TypeaheadTooltip<SuggestionItemType>(
  props: TypeaheadTooltipProps<SuggestionItemType>,
): React.Node {
  const {
    inputState,
    textarea,
    matchedStrings,
    suggestions,
    typeaheadTooltipActionsGetter,
    typeaheadTooltipButtonsGetter,
  } = props;

  const { textBeforeAtSymbol, textPrefix } = matchedStrings;

  const [isVisibleForAnimation, setIsVisibleForAnimation] =
    React.useState(false);

  const [chosenPositionInOverlay, setChosenPositionInOverlay] =
    React.useState<number>(0);

  const overlayRef = React.useRef<?HTMLDivElement>();

  React.useEffect(() => {
    setChosenPositionInOverlay(0);
  }, [suggestions]);

  React.useEffect(() => {
    setIsVisibleForAnimation(true);
    const setter = inputState.setTypeaheadState;
    setter({
      keepUpdatingThreadMembers: false,
    });

    return () => {
      setter({
        keepUpdatingThreadMembers: true,
      });
      setIsVisibleForAnimation(false);
    };
  }, [inputState.setTypeaheadState]);

  const actions = React.useMemo(
    () =>
      typeaheadTooltipActionsGetter({
        inputStateDraft: inputState.draft,
        inputStateSetDraft: inputState.setDraft,
        inputStateSetTextCursorPosition: inputState.setTextCursorPosition,
        suggestions,
        textBeforeAtSymbol,
        textPrefix,
      }),
    [
      inputState.draft,
      inputState.setDraft,
      inputState.setTextCursorPosition,
      suggestions,
      textBeforeAtSymbol,
      textPrefix,
      typeaheadTooltipActionsGetter,
    ],
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

  const tooltipButtons = React.useMemo(
    () =>
      typeaheadTooltipButtonsGetter({
        setChosenPositionInOverlay,
        chosenPositionInOverlay,
        actions,
      }),
    [typeaheadTooltipButtonsGetter, chosenPositionInOverlay, actions],
  );

  const close = React.useCallback(() => {
    const setter = inputState.setTypeaheadState;
    setter({
      canBeVisible: false,
      moveChoiceUp: null,
      moveChoiceDown: null,
      close: null,
      accept: null,
    });
  }, [inputState.setTypeaheadState]);

  const accept = React.useCallback(() => {
    actions[chosenPositionInOverlay].execute();
    close();
  }, [actions, chosenPositionInOverlay, close]);

  const moveChoiceUp = React.useCallback(() => {
    if (actions.length === 0) {
      return;
    }
    setChosenPositionInOverlay(previousPosition =>
      leastPositiveResidue(previousPosition - 1, actions.length),
    );
  }, [setChosenPositionInOverlay, actions.length]);

  const moveChoiceDown = React.useCallback(() => {
    if (actions.length === 0) {
      return;
    }
    setChosenPositionInOverlay(previousPosition =>
      leastPositiveResidue(previousPosition + 1, actions.length),
    );
  }, [setChosenPositionInOverlay, actions.length]);

  React.useEffect(() => {
    const setter = inputState.setTypeaheadState;
    setter({
      canBeVisible: true,
      moveChoiceUp,
      moveChoiceDown,
      close,
      accept,
    });

    return close;
  }, [
    close,
    accept,
    moveChoiceUp,
    moveChoiceDown,
    actions,
    inputState.setTypeaheadState,
  ]);

  React.useEffect(() => {
    const current = overlayRef.current;
    if (current) {
      const newScrollTop = getTypeaheadOverlayScroll(
        current.scrollTop,
        chosenPositionInOverlay,
      );
      current.scrollTo(0, newScrollTop);
    }
  }, [chosenPositionInOverlay]);

  if (suggestions.length === 0) {
    return null;
  }

  const overlayClasses = classNames(css.suggestionsContainer, {
    [css.notVisible]: !isVisibleForAnimation,
    [css.visible]: isVisibleForAnimation,
  });

  return (
    <div
      ref={overlayRef}
      className={overlayClasses}
      style={tooltipPositionStyle}
    >
      {tooltipButtons}
    </div>
  );
}

export default TypeaheadTooltip;
