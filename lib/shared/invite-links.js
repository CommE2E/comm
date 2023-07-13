// @flow

const inviteLinkErrorMessages = {
  invalid_characters: 'Link cannot contain any spaces or special characters.',
  offensive_words: 'No offensive or abusive words allowed.',
  already_in_use: 'Public link URL already in use.',
};

const defaultErrorMessage = 'Unknown error.';

export { inviteLinkErrorMessages, defaultErrorMessage };
