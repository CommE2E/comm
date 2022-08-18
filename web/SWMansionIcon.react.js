// @flow

import * as React from 'react';
import IcomoonReact from 'react-icomoon';

import iconSet from 'lib/shared/swmansion-icon-config.json';
/*

 To see all of the icons the application uses and what their names are:

 - Go to: https://icomoon.io/app/#/select
 - Click the import project button, upload the 
   lib/shared/swmansion-icon-config.json file and click the load button.
 - All of the icons in the selected icons section are used in the app
 - To see the icon image mapped to the name go to
   https://icomoon.io/app/#/select/image after going through the steps above

*/

export type Icon =
  | 'arrow-right-small'
  | 'bell'
  | 'logout'
  | 'plus-circle'
  | 'users'
  | 'chevron-right-small'
  | 'reply-arrow'
  | 'right-angle-arrow'
  | 'plus'
  | 'settings'
  | 'wrench'
  | 'message-filled-round'
  | 'bug'
  | 'cloud'
  | 'copy'
  | 'smile'
  | 'inbox'
  | 'info-circle'
  | 'message-circle-line'
  | 'question-circle'
  | 'search'
  | 'key'
  | 'chevron-left'
  | 'arrow-left'
  | 'arrow-right'
  | 'cross'
  | 'edit'
  | 'filters'
  | 'menu-horizontal'
  | 'menu-vertical'
  | 'message-square'
  | 'message-square-lines'
  | 'bell-disabled'
  | 'chevron-right'
  | 'send'
  | 'calendar'
  | 'message-circle-lines'
  | 'image'
  | 'upload'
  | 'user-circle'
  | 'arrow-left-small'
  | 'cross-circle'
  | 'document-clean'
  | 'globe'
  | 'link'
  | 'lock-on'
  | 'mail'
  | 'message-circle'
  | 'smart-phone'
  | 'user-plus'
  | 'warning-circle'
  | 'dino-avatar'
  | 'laptop'
  | 'list-filled'
  | 'reply-chat-bubble'
  | 'all-notifs'
  | 'badge-notifs'
  | 'muted-notifs'
  | 'check'
  | 'user-cross';

type SWMansionIconProps = {
  +icon: Icon,
  +size: number | string,
  +color?: string,
  +title?: string,
  +className?: string,
  +disableFill?: boolean,
  +removeInlineStyle?: boolean,
  +style?: $Shape<CSSStyleDeclaration>,
};

function SWMansionIcon(props: SWMansionIconProps): React.Node {
  return <IcomoonReact {...props} iconSet={iconSet} />;
}

export default SWMansionIcon;
