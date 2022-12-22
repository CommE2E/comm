// @flow

import classNames from 'classnames';
import * as React from 'react';

import SearchIndex from 'lib/shared/search-index';
import { threadOtherMembers } from 'lib/shared/thread-utils';
import { getTypeaheadUserSuggestions } from 'lib/shared/typeahead-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import type { InputState } from '../input/input-state';
import { type TypeaheadMatchedStrings } from './chat-input-bar.react';
import css from './typeahead-tooltip.css';
import {
  getTypeaheadTooltipActions,
  getTypeaheadTooltipPosition,
} from './typeahead-utils';

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
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(true);

    return () => setIsVisible(false);
  }, [setIsVisible]);

  const {
    entireText: matchedText,
    textBeforeAtSymbol: matchedTextBeforeAtSymbol,
    usernamePrefix: matchedUsernamePrefix,
  } = matchedStrings;

  const typedPrefix = matchedUsernamePrefix ?? '';

  const suggestedUsers = React.useMemo(
    () =>
      getTypeaheadUserSuggestions(
        userSearchIndex,
        threadOtherMembers(threadMembers, viewerID),
        typedPrefix,
      ),
    [userSearchIndex, threadMembers, viewerID, typedPrefix],
  );

  const actions = React.useMemo(
    () =>
      getTypeaheadTooltipActions(
        inputState,
        textarea,
        suggestedUsers,
        matchedTextBeforeAtSymbol,
        matchedText,
      ),
    [
      inputState,
      textarea,
      suggestedUsers,
      matchedTextBeforeAtSymbol,
      matchedText,
    ],
  );

  const tooltipPosition = React.useMemo(
    () =>
      getTypeaheadTooltipPosition(
        textarea,
        actions.length,
        matchedTextBeforeAtSymbol,
      ),
    [textarea, actions.length, matchedTextBeforeAtSymbol],
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
    [css.notVisible]: !isVisible,
    [css.visible]: isVisible,
  });

  return (
    <div className={overlayClasses} style={tooltipPositionStyle}>
      {tooltipButtons}
    </div>
  );
}

export default TypeaheadTooltip;
