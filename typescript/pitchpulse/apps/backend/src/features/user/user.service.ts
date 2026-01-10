import { db } from '../../db/client.js';
import { AppError } from '../../shared/middleware/errorHandler.js';

export interface OnboardingInput {
  teams: string[];
  leagues: string[];
}

export const userService = {
  async completeOnboarding(userId: string, input: OnboardingInput) {
    const { teams, leagues } = input;

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Update user onboarded status
      await client.query(
        'UPDATE users SET is_onboarded = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [true, userId]
      );

      // Get team IDs
      const teamResult = await client.query(
        'SELECT id, name FROM teams WHERE name = ANY($1)',
        [teams]
      );

      // Insert favorite teams
      for (const team of teamResult.rows) {
        await client.query(
          'INSERT INTO user_favorite_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, team.id]
        );
      }

      // Get league IDs
      const leagueResult = await client.query(
        'SELECT id, name FROM leagues WHERE name = ANY($1)',
        [leagues]
      );

      // Insert favorite leagues
      for (const league of leagueResult.rows) {
        await client.query(
          'INSERT INTO user_favorite_leagues (user_id, league_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, league.id]
        );
      }

      await client.query('COMMIT');

      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getUserPreferences(userId: string) {
    const teamsResult = await db.query(
      `SELECT t.id, t.name, t.league
       FROM teams t
       INNER JOIN user_favorite_teams uft ON t.id = uft.team_id
       WHERE uft.user_id = $1`,
      [userId]
    );

    const leaguesResult = await db.query(
      `SELECT l.id, l.name, l.country
       FROM leagues l
       INNER JOIN user_favorite_leagues ufl ON l.id = ufl.league_id
       WHERE ufl.user_id = $1`,
      [userId]
    );

    return {
      teams: teamsResult.rows,
      leagues: leaguesResult.rows,
    };
  },
};
