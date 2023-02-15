// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { TypeaheadMatchedStrings } from 'lib/shared/mention-utils.js';
import type { RelativeMemberInfo } from 'lib/types/thread-types.js';
import { leastPositiveResidue } from 'lib/utils/math-utils.js';

import css from './typeahead-tooltip.css';
import type { InputState } from '../input/input-state.js';
import {
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipActions,
  getTypeaheadTooltipButtons,
  getTypeaheadTooltipPosition,
} from '../utils/typeahead-utils.js';

export type TypeaheadTooltipProps = {
  +inputState: InputState,
  +textarea: HTMLTextAreaElement,
  +matchedStrings: TypeaheadMatchedStrings,
  +suggestedUsers: $ReadOnlyArray<RelativeMemberInfo>,
};

function TypeaheadTooltip(props: TypeaheadTooltipProps): React.Node {
  const { inputState, textarea, matchedStrings, suggestedUsers } = props;

  const { textBeforeAtSymbol, usernamePrefix } = matchedStrings;

  const [isVisibleForAnimation, setIsVisibleForAnimation] =
    React.useState(false);

  const [chosenPositionInOverlay, setChosenPositionInOverlay] =
    React.useState<number>(0);

  const overlayRef = React.useRef<?HTMLDivElement>();

  React.useEffect(() => {
    setChosenPositionInOverlay(0);
  }, [suggestedUsers]);

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
      getTypeaheadTooltipActions({
        inputStateDraft: inputState.draft,
        inputStateSetDraft: inputState.setDraft,
        inputStateSetTextCursorPosition: inputState.setTextCursorPosition,
        suggestedUsers,
        textBeforeAtSymbol,
        usernamePrefix,
      }),
    [
      inputState.draft,
      inputState.setDraft,
      inputState.setTextCursorPosition,
      suggestedUsers,
      textBeforeAtSymbol,
      usernamePrefix,
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
      getTypeaheadTooltipButtons(
        setChosenPositionInOverlay,
        chosenPositionInOverlay,
        actions,
      ),
    [setChosenPositionInOverlay, actions, chosenPositionInOverlay],
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

  if (suggestedUsers.length === 0) {
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
