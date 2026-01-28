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
  return db
    .createTable("user_profiles", {
      id: {
        type: "uuid",
        primaryKey: true,
        defaultValue: new String("gen_random_uuid()"),
      },
      user_id: {
        type: "uuid",
        notNull: true,
        foreignKey: {
          name: "user_profiles_user_id_fk",
          table: "users",
          mapping: "id",
          rules: { onDelete: "CASCADE" },
        },
      },
      date_of_birth: "date",
      gender: "string",
      location: "string",
      sport: "string",
      position: "string",
      bio: "text",
      created_at: { type: "timestamp", defaultValue: new String("NOW()") },
      updated_at: { type: "timestamp", defaultValue: new String("NOW()") },
    })
    .then(() =>
      db.createTable("team_coaches", {
        id: {
          type: "uuid",
          primaryKey: true,
          defaultValue: new String("gen_random_uuid()"),
        },
        team_id: {
          type: "uuid",
          notNull: true,
          foreignKey: {
            name: "team_coaches_team_id_fk",
            table: "teams",
            mapping: "id",
            rules: { onDelete: "CASCADE" },
          },
        },
        coach_id: {
          type: "uuid",
          notNull: true,
          foreignKey: {
            name: "team_coaches_coach_id_fk",
            table: "users",
            mapping: "id",
            rules: { onDelete: "CASCADE" },
          },
        },
        created_at: { type: "timestamp", defaultValue: new String("NOW()") },
        updated_at: { type: "timestamp", defaultValue: new String("NOW()") },
      }),
    )
    .then(() =>
      db.addIndex("staff", "idx_staff_user_club", ["user_id", "club_id"], true),
    )
    .then(() =>
      db.addIndex(
        "team_coaches",
        "idx_team_coaches_team_coach",
        ["team_id", "coach_id"],
        true,
      ),
    )
    .then(() =>
      db.addIndex(
        "players",
        "idx_players_email_club",
        ["email", "club_id"],
        true,
      ),
    )
    .then(() =>
      db.addIndex(
        "user_profiles",
        "idx_user_profiles_user_id",
        ["user_id"],
        true,
      ),
    );
};

exports.down = function (db) {
  return db
    .dropTable("user_profiles")
    .then(() => db.dropTable("team_coaches"))
    .then(() => db.removeIndex("staff", "idx_staff_user_club"))
    .then(() => db.removeIndex("players", "idx_players_email_club"));
};

exports._meta = {
  version: 1,
};
