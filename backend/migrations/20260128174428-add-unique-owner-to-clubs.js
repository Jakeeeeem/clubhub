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
  return db.addIndex("clubs", "idx_clubs_owner_id", ["owner_id"], true);
};

exports.down = function (db) {
  return db.removeIndex("clubs", "idx_clubs_owner_id");
};

exports._meta = {
  version: 1,
};
