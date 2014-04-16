/*

CREATE TABLE Race (MODE int not null, MAP varchar(30) not null, PLAYER_NICK varchar(30), PUBLIC_ID varchar(65) not null, SCORE integer not null, GAME_TIMESTAMP integer not null, RANK integer not null) engine=MyISAM; 
MODE: 0=PQL with weapons, 1=PQL strafe, 2=VQL with weapons, 3=VQL strafe

CREATE INDEX IX_RaceMap on Race (MAP, MODE, RANK);
CREATE INDEX IX_RacePlayer on Race (PLAYER_NICK, MODE);

*/
var
  fs = require('graceful-fs'),
  mysql = require('mysql'),
  async = require('async'),
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
