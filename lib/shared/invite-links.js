// @flow

const inviteLinkErrorMessages: { +[string]: string } = {
  invalid_characters: 'Link cannot contain any spaces or special characters.',
  offensive_words: 'No offensive or abusive words allowed.',
  already_in_use: 'Public link URL already in use.',
  link_reserved:
    'This public link is currently reserved. Please contact support@' +
    'comm.app if you would like to claim this link.',
};

const defaultErrorMessage = 'Unknown error.';

export { inviteLinkErrorMessages, defaultErrorMessage };
