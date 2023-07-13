// @flow

const inviteLinkErrorMessages = {
  invalid_characters: 'link cannot contain any spaces or special characters',
  offensive_words: 'no offensive or abusive words allowed',
  already_in_use: 'public link URL already in use',
};

const defaultErrorMessage = 'unknown error';

export { inviteLinkErrorMessages, defaultErrorMessage };
