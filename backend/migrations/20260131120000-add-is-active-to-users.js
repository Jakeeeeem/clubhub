"use strict";

var dbm;
var type;
var seed;
var fs = require("fs");
var path = require("path");
var Promise;

/**
 * We receive the dbmigrate dependency from main with up, down and edit
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
  Promise = options.Promise;
};

exports.up = function (db) {
  var filePath = path.join(
    __dirname,
    "sqls",
    "20260131120000-add-is-active-to-users-up.sql",
  );
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, { encoding: "utf-8" }, function (err, data) {
      if (err) return reject(err);
      console.log("received data: " + data);

      resolve(data);
    });
  }).then(function (data) {
    return db.runSql(data);
  });
};

exports.down = function (db) {
  var filePath = path.join(
    __dirname,
    "sqls",
    "20260131120000-add-is-active-to-users-down.sql",
  );
  return new Promise(function (resolve, reject) {
    fs.readFile(filePath, { encoding: "utf-8" }, function (err, data) {
      if (err) return reject(err);
      console.log("received data: " + data);

      resolve(data);
    });
  }).then(function (data) {
    return db.runSql(data);
  });
};

exports._meta = {
  version: 1,
};
