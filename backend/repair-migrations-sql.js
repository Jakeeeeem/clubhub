const fs = require('fs');
const path = require('path');

const migrationDir = path.join(__dirname, 'migrations');
const sqlsDir = path.join(migrationDir, 'sqls');

const template = (name) => `'use strict';

var dbm;
var type;
var seed;
var fs = require('fs');
var path = require('path');
var Promise;

/**
  * We receive the dbmigrate dependency from main into this migration.
  * Promise = dbmigrate.api.entities.Promise;
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
  Promise = options.Promise;
};

exports.up = function(db) {
  var filePath = path.join(__dirname, 'sqls', '${name}-up.sql');
  return new Promise( function( resolve, reject ) {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
      if (err) return reject(err);
      console.log('received data: ' + data);

      resolve(data);
    });
  })
  .then(function(data) {
    return db.runSql(data);
  });
};

exports.down = function(db) {
  var filePath = path.join(__dirname, 'sqls', '${name}-down.sql');
  return new Promise( function( resolve, reject ) {
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
      if (err) return reject(err);
      console.log('received data: ' + data);

      resolve(data);
    });
  })
  .then(function(data) {
    return db.runSql(data);
  });
};

exports._meta = {
  "version": 1
};
`;

fs.readdir(sqlsDir, (err, files) => {
    if (err) {
        return console.error('Unable to scan directory: ' + err);
    } 

    files.forEach(file => {
        if (file.endsWith('-up.sql')) {
            const name = file.replace('-up.sql', '');
            const jsFile = path.join(migrationDir, name + '.js');

            if (!fs.existsSync(jsFile)) {
                console.log(`Creating wrapper for ${name}...`);
                fs.writeFileSync(jsFile, template(name));
            } else {
                // console.log(`Wrapper exists for ${name}`);
            }
        }
    });
});
