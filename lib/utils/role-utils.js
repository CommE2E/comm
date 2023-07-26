// @flow

function constructRoleDeletionMessagePrompt(
  defaultRoleName: string,
  memberCount: number,
): string {
  let message;
  if (memberCount === 0) {
    message = 'Are you sure you want to delete this role?';
  } else {
    const messageNoun = memberCount === 1 ? 'member' : 'members';
    const messageVerb = memberCount === 1 ? 'is' : 'are';
    message =
      `There ${messageVerb} currently ${memberCount} ${messageNoun} with ` +
      `this role. Deleting the role will automatically assign the ` +
      `${messageNoun} affected to the ${defaultRoleName} role.`;
  }

  return message;
}

export { constructRoleDeletionMessagePrompt };
