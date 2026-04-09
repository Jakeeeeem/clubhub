const { query } = require("../config/database");

/**
 * Service to calculate and update player statistics
 */
const StatsService = {
  /**
   * Recalculates statistics for a specific player
   * @param {string} playerId 
   */
  async updatePlayerStats(playerId) {
    console.log(`📊 Recalculating stats for player: ${playerId}`);
    
    try {
      // 1. Calculate Attendance Rate
      // Formula: (Past events where availability = 'yes') / (Total past events targeting this player)
      const attendanceResult = await query(`
        WITH player_events AS (
          SELECT e.id
          FROM events e
          LEFT JOIN event_players ep ON e.id = ep.event_id
          WHERE (e.is_all_squad = true OR ep.player_id = $1)
          AND e.event_date < CURRENT_DATE
        ),
        attendance_stats AS (
          SELECT 
            COUNT(id) as total_events,
            COUNT(id) FILTER (WHERE EXISTS (
              SELECT 1 FROM availability_responses 
              WHERE event_id = player_events.id AND player_id = $1 AND availability = 'yes'
            )) as attended_events
          FROM player_events
        )
        SELECT 
          CASE 
            WHEN total_events > 0 THEN ROUND((attended_events::float / total_events::float) * 100)
            ELSE 100 
          END as attendance_rate
        FROM attendance_stats
      `, [playerId]);

      const attendanceRate = attendanceResult.rows[0]?.attendance_rate || 100;

      // 2. Aggregate Performance Stats from player_ratings
      const performanceResult = await query(`
        SELECT 
          SUM(goals) as total_goals,
          SUM(assists) as total_assists,
          SUM(yellow_cards) as total_yellows,
          SUM(red_cards) as total_reds,
          SUM(minutes_played) as total_minutes,
          AVG(rating) as avg_rating
        FROM player_ratings
        WHERE player_id = $1
      `, [playerId]);

      const perf = performanceResult.rows[0];

      // 3. Update Player Table
      await query(`
        UPDATE players 
        SET 
          attendance_rate = $2,
          goals = $3,
          assists = $4,
          yellow_cards = $5,
          red_cards = $6,
          minutes_played = $7,
          avg_rating = $8,
          updated_at = NOW()
        WHERE id = $1
      `, [
        playerId,
        attendanceRate,
        parseInt(perf.total_goals || 0),
        parseInt(perf.total_assists || 0),
        parseInt(perf.total_yellows || 0),
        parseInt(perf.total_reds || 0),
        parseInt(perf.total_minutes || 0),
        parseFloat(perf.avg_rating || 0).toFixed(2)
      ]);

      return {
        playerId,
        attendanceRate,
        performance: perf
      };
    } catch (error) {
      console.error(`❌ Failed to update player stats for ${playerId}:`, error);
      throw error;
    }
  },

  /**
   * Recalculates stats for all players in a club
   * @param {string} clubId 
   */
  async updateClubStats(clubId) {
    const playersResult = await query("SELECT id FROM players WHERE club_id = $1", [clubId]);
    const results = [];
    
    for (const player of playersResult.rows) {
      results.push(await this.updatePlayerStats(player.id));
    }
    
    return results;
  }
};

module.exports = StatsService;
