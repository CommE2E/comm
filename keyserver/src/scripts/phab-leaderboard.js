// @flow

import { main } from './utils.js';
import { postLeaderboard } from '../cron/phab-leaderboard.js';

main([postLeaderboard]);
