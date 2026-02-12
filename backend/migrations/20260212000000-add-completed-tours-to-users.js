"use strict";

exports.up = function (db) {
  return db.addColumn("users", "completed_tours", {
    type: "jsonb",
    defaultValue: "[]",
  });
};

exports.down = function (db) {
  return db.removeColumn("users", "completed_tours");
};

exports._meta = {
  version: 1,
};
