// @flow

import classNames from 'classnames';
import * as React from 'react';

import SearchIndex from 'lib/shared/search-index';
import { getTypeaheadUserSuggestions } from 'lib/shared/typeahead-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import type { InputState } from '../input/input-state';
import {
  getTypeaheadOverlayScroll,
  getTypeaheadTooltipActions,
  getTypeaheadTooltipButtons,
  getTypeaheadTooltipPosition,
  getTypeaheadChosenActionPosition,
} from '../utils/typeahead-utils';
import { type TypeaheadMatchedStrings } from './chat-input-bar.react';
import css from './typeahead-tooltip.css';

export type TypeaheadTooltipProps = {
  +inputState: InputState,
  +textarea: HTMLTextAreaElement,
  +userSearchIndex: SearchIndex,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  +viewerID: ?string,
  +matchedStrings: TypeaheadMatchedStrings,
};

function TypeaheadTooltip(props: TypeaheadTooltipProps): React.Node {
  const {
    inputState,
    textarea,
    userSearchIndex,
    threadMembers,
    viewerID,
    matchedStrings,
  } = props;

  const { textBeforeAtSymbol, usernamePrefix } = matchedStrings;

  const typedUsernamePrefix = usernamePrefix ?? '';

  const [animation, setAnimation] = React.useState(false);
  const overlayRef = React.useRef<?HTMLDivElement>();

  React.useEffect(() => {
    setAnimation(true);

    return () => setAnimation(false);
  }, [setAnimation]);

  const suggestedUsers = React.useMemo(
    () =>
      getTypeaheadUserSuggestions(
        userSearchIndex,
        threadMembers,
        viewerID,
        typedUsernamePrefix,
      ),
    [userSearchIndex, threadMembers, viewerID, typedUsernamePrefix],
  );

  const actions = React.useMemo(
    () =>
      getTypeaheadTooltipActions({
        inputStateDraft: inputState.draft,
        inputStateSetDraft: inputState.setDraft,
        inputStateSetTextCursorPosition: inputState.setTextCursorPosition,
        suggestedUsers,
        textBeforeAtSymbol,
        typedUsernamePrefix,
      }),
    [
      inputState.draft,
      inputState.setDraft,
      inputState.setTextCursorPosition,
      suggestedUsers,
      textBeforeAtSymbol,
      typedUsernamePrefix,
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

  const chosenActionPosition = React.useMemo(
    () =>
      getTypeaheadChosenActionPosition(
        inputState.typeaheadState.chosenButtonNumber,
        actions.length,
      ),
    [inputState.typeaheadState.chosenButtonNumber, actions.length],
  );

  const tooltipButtons = React.useMemo(() => {
    return getTypeaheadTooltipButtons(
      inputState.setTypeaheadState,
      actions,
      chosenActionPosition,
    );
  }, [inputState.setTypeaheadState, actions, chosenActionPosition]);

  const close = React.useCallback(() => {
    const setter = inputState.setTypeaheadState;
    setter({
      isVisible: false,
      chosenButtonNumber: 0,
      close: null,
      accept: null,
    });
  }, [inputState.setTypeaheadState]);

  const accept = React.useCallback(() => {
    actions[chosenActionPosition].onClick();
  }, [actions, chosenActionPosition]);

  React.useEffect(() => {
    const setter = inputState.setTypeaheadState;
    setter({
      close: close,
      accept: accept,
    });
  }, [close, accept, inputState.setTypeaheadState]);

  React.useEffect(() => {
    const current = overlayRef.current;
    if (current) {
      current.scrollTop = getTypeaheadOverlayScroll(
        current.scrollTop,
        chosenActionPosition,
      );
    }
  }, [chosenActionPosition]);

  React.useEffect(() => {
    const current = overlayRef.current;
    if (current) {
      current.scrollTop = getTypeaheadOverlayScroll(
        current.scrollTop,
        chosenActionPosition,
      );
    }
  }, [chosenActionPosition]);

  const overlayClasses = classNames(css.suggestionsContainer, {
    [css.notVisible]: !animation,
    [css.visible]: animation,
  });

  if (!actions || actions.length === 0) {
    return null;
  }

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
