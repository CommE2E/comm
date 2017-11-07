// @flow

import type { RelativeUserInfo } from '../types/user-types';
import type { RelativeMemberInfo } from '../types/thread-types';

function stringForUser(user: RelativeUserInfo | RelativeMemberInfo): string {
  if (user.isViewer) {
    return "you";
  } else if (user.username) {
    return user.username;
  } else {
    return "anonymous";
  }
}

export {
  stringForUser,
};
