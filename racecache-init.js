/*

*/
var
  fs = require('graceful-fs'),
  mysql = require('mysql2'),
  race = require('./racecache.js');

var __dirname; // externally defined

var dbpool;

main();

function main() {
  var data = fs.readFileSync(__dirname + '/cfg.json');
  var cfg = JSON.parse(data);
  dbpool = mysql.createPool(cfg.mysql_db);

  dbpool.getConnection(function (err, conn) {
    race.updateMap(conn, null, function () {
      conn.release();
      process.exit();
    });
  });
}
