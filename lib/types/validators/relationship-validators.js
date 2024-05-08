// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';
import { type RelationshipErrors } from '../relationship-types.js';

export const relationshipErrorsValidator: TInterface<RelationshipErrors> =
  tShape<RelationshipErrors>({
    invalid_user: t.maybe(t.list(t.String)),
    already_friends: t.maybe(t.list(t.String)),
    user_blocked: t.maybe(t.list(t.String)),
  });
