/*

MODE: 0=PQL with weapons, 1=PQL strafe, 2=VQL with weapons, 3=VQL strafe
*/
var
  fs = require('graceful-fs'),
  mysql = require('mysql2'),
  async = require('async');

exports.updateMap = function (conn, mapId, onDone) {
  var sql = "select MAP_ID,PLAYER_ID,SCORE,GAME_ID,GAME_TIMESTAMP,GL_S+RL_S+PG_S SHOTS, RULESET "
    + "from Game g inner join GamePlayer gp on gp.GAME_ID=g.ID "
    + "where g.GAME_TYPE='race' and g.RANKED=1 and gp.SCORE>0";
  if (mapId)
    sql += " and g.MAP_ID=?";

  var mapData = {};
  conn.query(sql, [mapId])
    .on("result", function (result) { processRaceRecord(result, mapData); })
    .on("error", function (err) { throw err; })
    .on("end", function () {
      insertRanking(conn, mapData, function () {
        if (onDone)
          onDone();
      });
    });
}

function processRaceRecord(result, mapData) {
  var map = result.MAP_ID;
  var player = result.PLAYER_ID;
  if (!mapData[map]) mapData[map] = {};
  var scores = mapData[map][player];
  if (!scores) {
    scores = { PLAYER_ID: player, MODES: [{}, {}, {}, {}] };
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
    pb.GAME_ID = result.GAME_ID;
    pb.GAME_TIMESTAMP = result.GAME_TIMESTAMP;
  }
}

function insertRanking(conn, mapData, cb) {
  async.forEach(Object.keys(mapData), function (mapId, next) {
    conn.query("delete from Race where MAP_ID=?", [mapId], function (err) {
      if (err) throw err;
      var countdownLatch = 0;
      for (var mode = 0; mode < 4; mode++) {
        var players = [];
        for (var player in mapData[mapId]) {
          if (mapData[mapId][player].MODES[mode].SCORE)
            players.push(mapData[mapId][player]);
        }
        players.sort(function (a, b) {
          var x = a.MODES[mode].SCORE;
          var y = b.MODES[mode].SCORE;
          return x < y ? -1 : x == y ? 0 : +1;
        });

        countdownLatch += players.length;
        var prevScore = 0, prevRank = 0;
        for (var rank0 = 0; rank0 < players.length; rank0++) {
          var scores = players[rank0];
          var pb = scores.MODES[mode];
          conn.query("insert into Race (MAP_ID, MODE, PLAYER_ID, GAME_ID, SCORE, GAME_TIMESTAMP, RANK) values (?,?,?,?,?,?,?)",
            [mapId, mode, scores.PLAYER_ID, pb.GAME_ID, pb.SCORE, pb.GAME_TIMESTAMP, pb.SCORE == prevScore ? prevRank + 1 : rank0 + 1],
            function (erre) {
              if (erre) throw erre;
              if (--countdownLatch == 0) {
                console.log("Updated race data for map #" + mapId);
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
