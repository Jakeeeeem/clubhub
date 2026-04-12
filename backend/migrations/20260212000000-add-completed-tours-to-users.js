"use strict";

exports.up = function (db) {
  // Use IF NOT EXISTS to make migration idempotent
  return db.runSql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_tours jsonb DEFAULT '[]'::jsonb;`);
};

exports.down = function (db) {
  return db.runSql(`ALTER TABLE users DROP COLUMN IF EXISTS completed_tours;`);
};

exports._meta = {
  version: 1,
};
