// @flow

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import classNames from 'classnames';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { localIDPrefix } from 'lib/shared/message-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';
import { type MessageTooltipAction } from '../utils/tooltip-utils';
import {
  tooltipButtonStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chat-constants';
import css from './message-tooltip.css';
import { useSendReaction } from './reaction-message-utils';
import { useTooltipContext } from './tooltip-provider';

type MessageTooltipProps = {
  +actions: $ReadOnlyArray<MessageTooltipAction>,
  +messageTimestamp: string,
  +alignment?: 'left' | 'center' | 'right',
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
function MessageTooltip(props: MessageTooltipProps): React.Node {
  const {
    actions,
    messageTimestamp,
    alignment = 'left',
    item,
    threadInfo,
  } = props;
  const { messageInfo, reactions } = item;

  const [activeTooltipLabel, setActiveTooltipLabel] = React.useState<?string>();

  const { renderEmojiKeyboard } = useTooltipContext();

  const messageActionButtonsContainerClassName = classNames(
    css.messageActionContainer,
    css.messageActionButtons,
  );

  const messageTooltipButtonStyle = React.useMemo(() => tooltipButtonStyle, []);

  const tooltipButtons = React.useMemo(() => {
    if (!actions || actions.length === 0) {
      return null;
    }
    const buttons = actions.map(({ label, onClick, actionButtonContent }) => {
      const onMouseEnter = () => {
        setActiveTooltipLabel(label);
      };
      const onMouseLeave = () =>
        setActiveTooltipLabel(oldLabel =>
          label === oldLabel ? null : oldLabel,
        );

      return (
        <div
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          key={label}
          onClick={onClick}
          style={messageTooltipButtonStyle}
          className={css.messageTooltipButton}
        >
          {actionButtonContent}
        </div>
      );
    });
    return (
      <div className={messageActionButtonsContainerClassName}>{buttons}</div>
    );
  }, [
    actions,
    messageActionButtonsContainerClassName,
    messageTooltipButtonStyle,
  ]);

  const messageTooltipLabelStyle = React.useMemo(() => tooltipLabelStyle, []);
  const messageTooltipTopLabelStyle = React.useMemo(
    () => ({
      height: `${tooltipLabelStyle.height + 2 * tooltipLabelStyle.padding}px`,
    }),
    [],
  );

  const tooltipLabel = React.useMemo(() => {
    if (!activeTooltipLabel) {
      return null;
    }
    return (
      <div className={css.messageTooltipLabel} style={messageTooltipLabelStyle}>
        {activeTooltipLabel}
      </div>
    );
  }, [activeTooltipLabel, messageTooltipLabelStyle]);

  const tooltipTimestamp = React.useMemo(() => {
    if (!messageTimestamp) {
      return null;
    }
    return (
      <div className={css.messageTooltipLabel} style={messageTooltipLabelStyle}>
        {messageTimestamp}
      </div>
    );
  }, [messageTimestamp, messageTooltipLabelStyle]);

  const nextLocalID = useSelector(state => state.nextLocalID);
  const localID = `${localIDPrefix}${nextLocalID}`;

  const sendReaction = useSendReaction(messageInfo.id, localID, threadInfo.id);

  const onEmojiSelect = React.useCallback(
    emoji => {
      const reactionInput = emoji.native;
      let viewerReacted = false;
      if (Object.keys(reactions).length > 0) {
        viewerReacted = reactions[reactionInput].viewerReacted;
      }
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      sendReaction(reactionInput, action);
    },
    [sendReaction, reactions],
  );

  const emojiKeyboard = React.useMemo(() => {
    if (!renderEmojiKeyboard) {
      return null;
    }
    return <Picker data={data} onEmojiSelect={onEmojiSelect} />;
  }, [onEmojiSelect, renderEmojiKeyboard]);

  const messageTooltipContainerStyle = React.useMemo(() => tooltipStyle, []);

  const containerClassName = classNames({
    [css.container]: true,
    [css.containerLeftAlign]: alignment === 'left',
    [css.containerCenterAlign]: alignment === 'center',
  });

  const messageTooltipContainerClassNames = classNames({
    [css.messageTooltipContainer]: true,
    [css.leftTooltipAlign]: alignment === 'left',
    [css.centerTooltipAlign]: alignment === 'center',
    [css.rightTooltipAlign]: alignment === 'right',
  });

  return (
    <div className={containerClassName}>
      {emojiKeyboard}
      <div
        className={messageTooltipContainerClassNames}
        style={messageTooltipContainerStyle}
      >
        <div style={messageTooltipTopLabelStyle}>{tooltipLabel}</div>
        {tooltipButtons}
        {tooltipTimestamp}
      </div>
    </div>
  );
}

export default MessageTooltip;
