"use strict";

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.runSql(`
    ALTER TABLE clubs ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
    ALTER TABLE clubs ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
    ALTER TABLE clubs ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255);
  `);
};

exports.down = function (db) {
  return db
    .removeColumn("clubs", "contact_email")
    .then(() => db.removeColumn("clubs", "contact_phone"))
    .then(() => db.removeColumn("clubs", "stripe_account_id"));
};

exports._meta = {
  version: 1,
};
