// @flow

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import classNames from 'classnames';
import * as React from 'react';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { localIDPrefix } from 'lib/shared/message-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import {
  tooltipButtonStyle,
  tooltipLabelStyle,
  tooltipStyle,
} from './chat-constants.js';
import css from './message-tooltip.css';
import {
  useSendReaction,
  getEmojiKeyboardPosition,
} from './reaction-message-utils.js';
import { useTooltipContext } from './tooltip-provider.js';
import { useSelector } from '../redux/redux-utils.js';
import type {
  MessageTooltipAction,
  TooltipSize,
  TooltipPositionStyle,
} from '../utils/tooltip-utils.js';

type MessageTooltipProps = {
  +actions: $ReadOnlyArray<MessageTooltipAction>,
  +messageTimestamp: string,
  +tooltipPositionStyle: TooltipPositionStyle,
  +tooltipSize: TooltipSize,
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
function MessageTooltip(props: MessageTooltipProps): React.Node {
  const {
    actions,
    messageTimestamp,
    tooltipPositionStyle,
    tooltipSize,
    item,
    threadInfo,
  } = props;
  const { messageInfo, reactions } = item;

  const { alignment = 'left' } = tooltipPositionStyle;

  const [activeTooltipLabel, setActiveTooltipLabel] = React.useState<?string>();

  const { shouldRenderEmojiKeyboard } = useTooltipContext();

  const [emojiKeyboardNode, setEmojiKeyboardNode] = React.useState(null);

  const emojiKeyboardRef = React.useRef();

  // Using an effect to set state is generally considered an anti-pattern in
  // React, and should be avoided. In this case it's necessary because we
  // want to set the ref of the emoji keyboard after <Picker /> initially
  // renders onto the DOM so we can get the correct height and width
  React.useEffect(() => {
    if (emojiKeyboardRef.current && shouldRenderEmojiKeyboard) {
      setEmojiKeyboardNode(emojiKeyboardRef.current);
    }
  }, [shouldRenderEmojiKeyboard]);

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

  const emojiKeyboardPosition = React.useMemo(
    () =>
      getEmojiKeyboardPosition(
        emojiKeyboardNode,
        tooltipPositionStyle,
        tooltipSize,
      ),
    [emojiKeyboardNode, tooltipPositionStyle, tooltipSize],
  );

  const emojiKeyboardPositionStyle = React.useMemo(() => {
    if (!emojiKeyboardPosition) {
      return null;
    }

    return {
      bottom: emojiKeyboardPosition.bottom,
      left: emojiKeyboardPosition.left,
    };
  }, [emojiKeyboardPosition]);

  const nextLocalID = useSelector(state => state.nextLocalID);
  const localID = `${localIDPrefix}${nextLocalID}`;

  const sendReaction = useSendReaction(messageInfo.id, localID, threadInfo.id);

  const onEmojiSelect = React.useCallback(
    emoji => {
      const reactionInput = emoji.native;

      const viewerReacted = reactions[reactionInput]
        ? reactions[reactionInput].viewerReacted
        : false;
      const action = viewerReacted ? 'remove_reaction' : 'add_reaction';

      sendReaction(reactionInput, action);
    },
    [sendReaction, reactions],
  );

  const emojiKeyboard = React.useMemo(() => {
    if (!shouldRenderEmojiKeyboard) {
      return null;
    }

    return (
      <div
        ref={emojiKeyboardRef}
        style={emojiKeyboardPositionStyle}
        className={css.emojiKeyboard}
      >
        <Picker data={data} onEmojiSelect={onEmojiSelect} />
      </div>
    );
  }, [emojiKeyboardPositionStyle, onEmojiSelect, shouldRenderEmojiKeyboard]);

  const messageTooltipContainerStyle = React.useMemo(() => tooltipStyle, []);

  const containerClassName = classNames({
    [css.messageTooltipContainer]: true,
    [css.leftTooltipAlign]: alignment === 'left',
    [css.centerTooltipAlign]: alignment === 'center',
    [css.rightTooltipAlign]: alignment === 'right',
  });

  return (
    <>
      {emojiKeyboard}
      <div className={containerClassName} style={messageTooltipContainerStyle}>
        <div style={messageTooltipTopLabelStyle}>{tooltipLabel}</div>
        {tooltipButtons}
        {tooltipTimestamp}
      </div>
    </>
  );
}

export default MessageTooltip;
