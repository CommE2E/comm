// @flow

import * as React from 'react';

import SearchIndex from 'lib/shared/search-index';
import { threadOtherMembers } from 'lib/shared/thread-utils';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import Button from '../components/button.react';
import type { InputState } from '../input/input-state';
import css from './mention-suggestion-tooltip.css';
import {
  getTypeaheadTooltipActions,
  getTypeaheadTooltipPosition,
  getTypeaheadUserSuggestions,
} from './mention-utils';

export type MentionSuggestionTooltipProps = {
  +inputState: InputState,
  +textarea: HTMLTextAreaElement,
  +userSearchIndex: SearchIndex,
  +threadMembers: $ReadOnlyArray<RelativeMemberInfo>,
  +viewerID: ?string,
  +matchedText: string,
  +matchedTextBeforeAtSymbol: string,
  +matchedUsernamePrefix: string,
};

function MentionSuggestionTooltip(
  props: MentionSuggestionTooltipProps,
): React.Node {
  const {
    inputState,
    textarea,
    userSearchIndex,
    threadMembers,
    viewerID,
    matchedText,
    matchedTextBeforeAtSymbol,
    matchedUsernamePrefix,
  } = props;

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

  return (
    <div className={css.suggestionsContainer} style={tooltipPositionStyle}>
      {tooltipButtons}
    </div>
  );
}

export default MentionSuggestionTooltip;
