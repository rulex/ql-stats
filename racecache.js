/*

create table Race (MODE int not null, MAP varchar(30) not null, PLAYER_NICK varchar(30), PUBLIC_ID varchar(65) not null, SCORE integer not null, GAME_TIMESTAMP integer not null, RANK integer not null) engine=MyISAM; 
MODE: 0=PQL with weapons, 1=PQL strafe, 2=VQL with weapons, 3=VQL strafe

*/
var
  fs = require('graceful-fs'),
  mysql = require('mysql'),
  async = require('async');

exports.updateMap = function (conn, map, onDone) {
  var sql = "select MAP,PLAYER_NICK,g.PUBLIC_ID,SCORE,GAME_TIMESTAMP,GL_S+RL_S+PG_S SHOTS, RULESET from Games g inner join Players p on p.PUBLIC_ID=g.PUBLIC_ID "
    + "where g.GAME_TYPE='race' and g.RANKED=1 and SCORE>0";
  if (map)
    sql += " and MAP=?";

  var mapData = {};
  conn.query(sql, [map])
    .on("result", function(result) { processRaceRecord(result, mapData); })
    .on("error", function(err) { throw err; })
    .on("end", function() {
      insertRanking(conn, mapData, function () {
        if (onDone)
          onDone();
      });
    });
}

function processRaceRecord(result, mapData) {
  var map = result.MAP;
  var player = result.PLAYER_NICK;
  if (!mapData[map]) mapData[map] = {};
  var scores = mapData[map][player];
  if (!scores) {
    scores = { PLAYER_NICK: player, MODES: [{}, {}, {}, {}] };
    mapData[map][player] = scores;
  }
  updatePersonalBest(scores.MODES[0], result);
  if (result.SHOTS == 0)
    updatePersonalBest(scores.MODES[1], result);
  if (result.RULESET == 1) {
    updatePersonalBest(scores.MODES[2], result);
    if (result.SHOTS == 0)
      updatePersonalBest(scores.MODES[3], result);
  }
}

function updatePersonalBest(pb, result) {
  var score = result.SCORE;
  if (!pb.SCORE || score < pb.SCORE) {
    pb.SCORE = score;
    pb.PUBLIC_ID = result.PUBLIC_ID;
    pb.GAME_TIMESTAMP = result.GAME_TIMESTAMP;
  }
}

function insertRanking(conn, mapData, cb) {
  async.forEach(Object.keys(mapData).sort(), function(map, next) {
    conn.query("delete from Race where MAP=?", [map], function (err) {
      if (err) throw err;
      var countdownLatch = 0;
      for (var mode = 0; mode < 4; mode++) {
        var players = [];
        for (var player in mapData[map]) {
          if (mapData[map][player].MODES[mode].SCORE)
            players.push(mapData[map][player]);
        }
        players.sort(function(a, b) {
          var x = a.MODES[mode].SCORE;
          var y = b.MODES[mode].SCORE;
          return x < y ? -1 : x == y ? 0 : +1;
        });

        countdownLatch += players.length;
        var prevScore = 0, prevRank = 0;
        for (var rank0 = 0; rank0 < players.length; rank0++) {
          var scores = players[rank0];
          var pb = scores.MODES[mode];
          conn.query("insert into Race (MAP, MODE, PLAYER_NICK, PUBLIC_ID, SCORE, GAME_TIMESTAMP, RANK) values (?,?,?,?,?,?,?)",
            [map, mode, scores.PLAYER_NICK, pb.PUBLIC_ID, pb.SCORE, pb.GAME_TIMESTAMP, pb.SCORE == prevScore ? prevRank + 1 : rank0 + 1],
            function(err) {
              if (err) throw err;
              if (--countdownLatch == 0) {
                console.log("Updated race data for " + map);
                next();
              }
            }
          );
          prevRank = rank0;
          prevScore = pb.SCORE;
        }
      }
    });
  }, cb);
}
