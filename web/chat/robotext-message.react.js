// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type RobotextChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { chatMessageItemEngagementTargetMessageInfo } from 'lib/shared/chat-message-item-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import {
  entityTextToReact,
  useResolvedEntityText,
} from 'lib/utils/entity-text.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import InlineEngagement from './inline-engagement.react.js';
import css from './robotext-message.css';
import Markdown from '../markdown/markdown.react.js';
import { linkRules } from '../markdown/rules.react.js';
import { usePushUserProfileModal } from '../modals/user-profile/user-profile-utils.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { useMessageTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

const availableTooltipPositionsForRobotext = [
  tooltipPositions.LEFT,
  tooltipPositions.LEFT_TOP,
  tooltipPositions.LEFT_BOTTOM,
  tooltipPositions.RIGHT,
  tooltipPositions.RIGHT_TOP,
  tooltipPositions.RIGHT_BOTTOM,
];

type Props = {
  +item: RobotextChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
function RobotextMessage(props: Props): React.Node {
  let inlineEngagement;
  const { item, threadInfo } = props;
  const { threadCreatedFromMessage, reactions } = item;
  const engagementTargetMessageInfo =
    chatMessageItemEngagementTargetMessageInfo(item);
  if (
    engagementTargetMessageInfo &&
    (threadCreatedFromMessage || Object.keys(reactions).length > 0)
  ) {
    inlineEngagement = (
      <div className={css.sidebarMarginTop}>
        <InlineEngagement
          messageInfo={engagementTargetMessageInfo}
          threadInfo={threadInfo}
          sidebarThreadInfo={threadCreatedFromMessage}
          reactions={reactions}
          positioning="center"
          deleted={false}
        />
      </div>
    );
  }

  const { messageInfos, robotext } = item;
  const { threadID } = messageInfos[0];
  const resolvedRobotext = useResolvedEntityText(robotext);
  invariant(
    resolvedRobotext,
    'useResolvedEntityText only returns falsey when passed falsey',
  );
  const textParts = React.useMemo(() => {
    return entityTextToReact(resolvedRobotext, threadID, {
      renderText: ({ text }) => (
        <Markdown rules={linkRules(false)}>{text}</Markdown>
      ),
      renderThread: ({ id, name }) => <ThreadEntity id={id} name={name} />,
      renderUser: ({ userID, usernameText }) => (
        <UserEntity userID={userID} usernameText={usernameText} />
      ),
      renderColor: ({ hex }) => <ColorEntity color={hex} />,
      renderFarcasterUser: ({ farcasterUsername }) => (
        <span>{farcasterUsername}</span>
      ),
    });
  }, [resolvedRobotext, threadID]);

  const { onMouseEnter, onMouseLeave } = useMessageTooltip({
    item,
    threadInfo,
    availablePositions: availableTooltipPositionsForRobotext,
  });

  return (
    <div className={css.robotextContainer}>
      <div
        className={css.innerRobotextContainer}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span>{textParts}</span>
      </div>
      {inlineEngagement}
    </div>
  );
}

type BaseInnerThreadEntityProps = {
  +id: string,
  +name: string,
};
type InnerThreadEntityProps = {
  ...BaseInnerThreadEntityProps,
  +threadInfo: ThreadInfo,
  +dispatch: Dispatch,
};
class InnerThreadEntity extends React.PureComponent<InnerThreadEntityProps> {
  render(): React.Node {
    return <a onClick={this.onClickThread}>{this.props.name}</a>;
  }

  onClickThread = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const id = this.props.id;
    this.props.dispatch({
      type: updateNavInfoActionType,
      payload: {
        activeChatThreadID: id,
      },
    });
  };
}
const ThreadEntity = React.memo<BaseInnerThreadEntityProps>(
  function ConnectedInnerThreadEntity(props: BaseInnerThreadEntityProps) {
    const { id } = props;
    const threadInfo = useSelector(state => threadInfoSelector(state)[id]);
    const dispatch = useDispatch();

    return (
      <InnerThreadEntity
        {...props}
        threadInfo={threadInfo}
        dispatch={dispatch}
      />
    );
  },
);

type UserEntityProps = {
  +userID: string,
  +usernameText: string,
};

function UserEntity(props: UserEntityProps) {
  const { userID, usernameText } = props;

  const pushUserProfileModal = usePushUserProfileModal(userID);

  return <a onClick={pushUserProfileModal}>{usernameText}</a>;
}

function ColorEntity(props: { color: string }) {
  const colorStyle = { color: props.color };
  return <span style={colorStyle}>{props.color}</span>;
}

const MemoizedRobotextMessage: React.ComponentType<Props> =
  React.memo<Props>(RobotextMessage);

export default MemoizedRobotextMessage;
