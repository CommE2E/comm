// @flow

import type { ThreadInfo, RelativeMemberInfo } from 'lib/types/thread-types';

import { createTooltip } from '../../navigation/tooltip.react';
import ThreadSettingsMemberTooltipButton
  from './thread-settings-member-tooltip-button.react';

type CustomProps = {
  memberInfo: RelativeMemberInfo,
  threadInfo: ThreadInfo,
};

function onRemoveUser(props: CustomProps) {
}

function onToggleAdmin(props: CustomProps) {
}

const spec = {
  entries: [
    { id: "remove_user", text: "Remove user", onPress: onRemoveUser },
    { id: "remove_admin", text: "Remove admin", onPress: onToggleAdmin },
    { id: "make_admin", text: "Make admin", onPress: onToggleAdmin },
  ],
};

const ThreadSettingsMemberTooltipModal = createTooltip(
  ThreadSettingsMemberTooltipButton,
  spec,
);

export default ThreadSettingsMemberTooltipModal;
