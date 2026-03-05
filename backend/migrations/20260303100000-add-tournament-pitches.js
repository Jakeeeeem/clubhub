"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sql = `
      -- Pitch Management
      CREATE TABLE IF NOT EXISTS tournament_pitches (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          pitch_type VARCHAR(50) DEFAULT 'Grass',
          pitch_size VARCHAR(50) DEFAULT '11v11',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Link matches to pitches
      ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS pitch_id UUID REFERENCES tournament_pitches(id) ON DELETE SET NULL;
      ALTER TABLE tournament_matches ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE;
      
      -- Triggers
      CREATE TRIGGER update_tournament_pitches_updated_at BEFORE UPDATE ON tournament_pitches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    return queryInterface.sequelize.query(sql);
  },

  down: async (queryInterface, Sequelize) => {
    const sql = `
      ALTER TABLE tournament_matches DROP COLUMN IF EXISTS pitch_id;
      ALTER TABLE tournament_matches DROP COLUMN IF EXISTS end_time;
      DROP TABLE IF EXISTS tournament_pitches;
    `;
    return queryInterface.sequelize.query(sql);
  },
};
