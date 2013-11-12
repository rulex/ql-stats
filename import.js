//select Players.PLAYER_NICK,count(*),sum(Players.KILLS),sum(Players.DEATHS),sum(Players.PLAY_TIME),sum(Players.DAMAGE_DEALT),sum(Players.DAMAGE_TAKEN),avg(RL_A),avg(RG_A),avg(LG_A) from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER='rul3x' GROUP BY Players.PLAYER_NICK ORDER BY sum(Players.KILLS) desc;

//var agent = require( 'webkit-devtools-agent' );

//var heapdump = require( 'heapdump' );

var util = require( 'util' );

var fs = require( 'graceful-fs' );
var mysql = require( 'mysql' );
var express = require( 'express' );
var app = express();
app.enable( "jsonp callback" );
var http = require( 'http' );
var url = require( 'url' );
var server = http.createServer( app );

// read cfg.json
var data = fs.readFileSync( __dirname + '/cfg.json' );
var cfg;
try {
	cfg = JSON.parse( data );
	console.log( 'info', 'Parsed cfg' );
}
catch( err ) {
	console.log( 'warn', 'failed to parse cfg: ' + err );
}
var db = mysql.createConnection( {
	host: cfg.mysql_db.host,
	//database: cfg.mysql_db.database,
	database: "qlstats_test",
	user: cfg.mysql_db.user,
	password: cfg.mysql_db.password,
	multipleStatements: true,
} );
db.connect();

setInterval( function() {
	//heapdump.writeSnapshot();
	var _m = util.inspect( process.memoryUsage() );
	console.log( _m );
	console.log( { rss: _m.rss , heapTotal: _size( _m.heapTotal ), heapUsed: _size( _m.heapUsed ) } );
}, 30*1000 );

app.get( '/', function _app_get( req, res ) {
	var dir='./testgames/';
	var data={};
	var most_accurate = [];
	fs.readdir( dir, function _fs_readdir( err, files ) {
		if( err ) throw err;
		var c = 0;
		files.forEach( function _files_foreach( file ) {
			c++;
			/*
			if( file.match( /.json$/ ) ) {
				console.log( c + " " + dir + file );
				fs.readFile( dir + file, 'utf-8', function _fs_readfile( err, thedata ) {
					if( err ) { console.log( err ); throw err; }
					var j = JSON.parse( thedata );
					if( file != 'undefined.json' ) {
						var AVG_ACC = 0;
						var MOST_ACCURATE_NICK = "";
						var MOST_ACCURATE_NUM = 0;
						var DMG_DELIVERED_NICK = "";
						var DMG_DELIVERED_NUM = 0;
						var DMG_TAKEN_NICK = "";
						var DMG_TAKEN_NUM = 0;
						var LEAST_DEATHS_NICK = "";
						var LEAST_DEATHS_NUM = 0;
						var MOST_DEATHS_NICK = "";
						var MOST_DEATHS_NUM = 0;
						var TOTAL_ROUNDS = 0;
						var WINNING_TEAM = "";
						if( !isNaN( j.AVG_ACC ) && j.AVG_ACC !== 'undefined' ) {
							AVG_ACC = j.AVG_ACC;
						}
						if( typeof j.MOST_ACCURATE !== 'undefined' ) {
							MOST_ACCURATE_NICK = j.MOST_ACCURATE.PLAYER_NICK;
							MOST_ACCURATE_NUM = j.MOST_ACCURATE.NUM;
						}
						if( typeof j.DMG_DELIVERED !== 'undefined' ) {
							DMG_DELIVERED_NICK = j.DMG_DELIVERED.PLAYER_NICK;
							DMG_DELIVERED_NUM = j.DMG_DELIVERED.NUM;
						}
						if( typeof j.DMG_TAKEN !== 'undefined' ) {
							DMG_TAKEN_NICK = j.DMG_TAKEN.PLAYER_NICK;
							DMG_TAKEN_NUM = j.DMG_TAKEN.NUM;
						}
						if( typeof j.LEAST_DEATHS !== 'undefined' ) {
							LEAST_DEATHS_NICK = j.LEAST_DEATHS.PLAYER_NICK;
							LEAST_DEATHS_NUM = j.LEAST_DEATHS.NUM;
						}
						if( typeof j.MOST_DEATHS !== 'undefined' ) {
							MOST_DEATHS_NICK = j.MOST_DEATHS.PLAYER_NICK;
							MOST_DEATHS_NUM = j.MOST_DEATHS.NUM;
						}
						if( typeof j.TOTAL_ROUNDS !== 'undefined' ) {
							TOTAL_ROUNDS = j.TOTAL_ROUNDS;
							WINNING_TEAM = j.WINNING_TEAM;
						}
						var sql1 = 'INSERT INTO Games(' +
								'PUBLIC_ID,' +
								'OWNER, ' +
								'MAP, ' +
								'NUM_PLAYERS, ' +
								'AVG_ACC, ' +
								'PREMIUM, ' +
								'RANKED, ' +
								'RESTARTED, ' +
								'RULESET, ' +
								'TIER, ' +
								'TOTAL_KILLS, ' +
								'TOTAL_ROUNDS, ' +
								'WINNING_TEAM, ' +
								'TSCORE0, ' +
								'TSCORE1, ' +
								'FIRST_SCORER, ' +
								'LAST_SCORER, ' +
								'GAME_LENGTH, ' +
								'GAME_TYPE, ' +
								'GAME_TIMESTAMP, ' +
								'DMG_DELIVERED_NICK, ' +
								'DMG_DELIVERED_NUM, ' +
								'DMG_TAKEN_NICK, ' +
								'DMG_TAKEN_NUM, ' +
								'LEAST_DEATHS_NICK, ' +
								'LEAST_DEATHS_NUM, ' +
								'MOST_DEATHS_NICK, ' +
								'MOST_DEATHS_NUM, ' +
								'MOST_ACCURATE_NICK, ' +
								'MOST_ACCURATE_NUM ' +
								') values( ';
									var sql2 = '' +
									'\"' + j.PUBLIC_ID + '\",' +
									'\"' + j.OWNER + '\",' +
									'\"' + j.MAP + '\",' +
									'' + j.NUM_PLAYERS + ',' +
									'' + AVG_ACC + ',' +
									'' + j.PREMIUM + ',' +
									'' + j.RANKED + ',' +
									'' + j.RESTARTED + ',' +
									'' + j.RULESET + ',' +
									'' + j.TIER + ',' +
									'' + j.TOTAL_KILLS + ',' +
									'' + TOTAL_ROUNDS + ',' +
									'\"' + WINNING_TEAM + '\",' +
									'' + j.TSCORE0 + ',' +
									'' + j.TSCORE1 + ',' +
									'\"' + j.FIRST_SCORER + '\",' +
									'\"' + j.LAST_SCORER + '\",' +
									'' + j.GAME_LENGTH + ',' +
									'\"' + j.GAME_TYPE + '\",' +
									'' + new Date( j.GAME_TIMESTAMP ).getTime()/1000 + ',' +
									'\"' + DMG_DELIVERED_NICK + '\",' +
									'' + DMG_DELIVERED_NUM + ',' +
									'\"' + DMG_TAKEN_NICK + '\",' +
									'' + DMG_TAKEN_NUM + ',' +
									'\"' + LEAST_DEATHS_NICK + '\",' +
									'' + LEAST_DEATHS_NUM + ',' +
									'\"' + MOST_DEATHS_NICK + '\",' +
									'' + MOST_DEATHS_NUM + ',' +
									'\"' + MOST_ACCURATE_NICK + '\",' +
									'' + MOST_ACCURATE_NUM +
									')';
						//console.log( sql1 );
						//console.log( sql2 );
						db.query( sql1 + sql2, function _db_query_game( err, rows, fields ) {
							if( err ) { throw err; }
							//console.log( rows );
						}	);
						for( var i in j.BLUE_SCOREBOARD ) {
							var p = j.BLUE_SCOREBOARD[i];
							var IMPRESSIVE = 0;
							var EXCELLENT = 0;
							if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
							if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
							//console.log( j.PUBLIC_ID + " " + p.PLAYER_NICK + " " + p.TEAM );
							var sql3 = 'INSERT INTO Players(' +
								'PUBLIC_ID, ' +
								'PLAYER_NICK, ' +
								'PLAYER_CLAN, ' +
								'PLAYER_COUNTRY, ' +
								'RANK, ' +
								'SCORE, ' +
								'QUIT, ' +
								'DAMAGE_DEALT, ' +
								'DAMAGE_TAKEN, ' +
								'KILLS, ' +
								'DEATHS, ' +
								'HITS, ' +
								'SHOTS, ' +
								'TEAM, ' +
								'TEAM_RANK, ' +
								'HUMILIATION, ' +
								'IMPRESSIVE, ' +
								'EXCELLENT, ' +
								'PLAY_TIME, ' +

								'G_A, ' +
								'G_H, ' +
								'G_K, ' +
								'G_S, ' +

								'GL_A, ' +
								'GL_H, ' +
								'GL_K, ' +
								'GL_S, ' +

								'LG_A, ' +
								'LG_H, ' +
								'LG_K, ' +
								'LG_S, ' +

								'MG_A, ' +
								'MG_H, ' +
								'MG_K, ' +
								'MG_S, ' +

								'PG_A, ' +
								'PG_H, ' +
								'PG_K, ' +
								'PG_S, ' +

								'RG_A, ' +
								'RG_H, ' +
								'RG_K, ' +
								'RG_S, ' +

								'RL_A, ' +
								'RL_H, ' +
								'RL_K, ' +
								'RL_S, ' +

								'SG_A, ' +
								'SG_H, ' +
								'SG_K, ' +
								'SG_S' +

								') values( ';
							var sql4 = '' +
								'\"' + j.PUBLIC_ID + '\",' +
								'\"' + p.PLAYER_NICK + '\",' +
								'\"' + p.PLAYER_CLAN + '\",' +
								'\"' + p.PLAYER_COUNTRY + '\",' +
								'' + p.RANK + ',' +
								'' + p.SCORE + ',' +
								'' + p.QUIT + ',' +
								'' + p.DAMAGE_DEALT + ',' +
								'' + p.DAMAGE_TAKEN + ',' +
								'' + p.KILLS + ',' +
								'' + p.DEATHS + ',' +
								'' + p.HITS + ',' +
								'' + p.SHOTS + ',' +
								'\"' + p.TEAM + '\",' +
								'' + p.TEAM_RANK + ',' +
								'' + p.HUMILIATION + ',' +
								'' + IMPRESSIVE + ',' +
								'' + EXCELLENT + ',' +
								'' + p.PLAY_TIME + ',' +

								'' + p.GAUNTLET_ACCURACY + ',' +
								'' + p.GAUNTLET_HITS + ',' +
								'' + p.GAUNTLET_KILLS + ',' +
								'' + p.GAUNTLET_SHOTS + ',' +

								'' + p.GRENADE_ACCURACY + ',' +
								'' + p.GRENADE_HITS + ',' +
								'' + p.GRENADE_KILLS + ',' +
								'' + p.GRENADE_SHOTS + ',' +

								'' + p.LIGHTNING_ACCURACY + ',' +
								'' + p.LIGHTNING_HITS + ',' +
								'' + p.LIGHTNING_KILLS + ',' +
								'' + p.LIGHTNING_SHOTS + ',' +

								'' + p.MACHINEGUN_ACCURACY + ',' +
								'' + p.MACHINEGUN_HITS + ',' +
								'' + p.MACHINEGUN_KILLS + ',' +
								'' + p.MACHINEGUN_SHOTS + ',' +

								'' + p.PLASMA_ACCURACY + ',' +
								'' + p.PLASMA_HITS + ',' +
								'' + p.PLASMA_KILLS + ',' +
								'' + p.PLASMA_SHOTS + ',' +

								'' + p.RAILGUN_ACCURACY + ',' +
								'' + p.RAILGUN_HITS + ',' +
								'' + p.RAILGUN_KILLS + ',' +
								'' + p.RAILGUN_SHOTS + ',' +

								'' + p.ROCKET_ACCURACY + ',' +
								'' + p.ROCKET_HITS + ',' +
								'' + p.ROCKET_KILLS + ',' +
								'' + p.ROCKET_SHOTS + ',' +

								'' + p.SHOTGUN_ACCURACY + ',' +
								'' + p.SHOTGUN_HITS + ',' +
								'' + p.SHOTGUN_KILLS + ',' +
								'' + p.SHOTGUN_SHOTS +
								')';
							//console.log( i + " " + sql3 );
							//console.log( i + " " + sql4 );
							db.query( sql3 + sql4, function _db_query_blue( err, rows, fields ) {
								if( err ) { throw err; }
							} );
						}
						for( var i in j.RED_SCOREBOARD ) {
							var p = j.RED_SCOREBOARD[i];
							var IMPRESSIVE = 0;
							var EXCELLENT = 0;
							if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
							if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
							//console.log( j.PUBLIC_ID + " " + p.PLAYER_NICK + " " + p.TEAM );
							var sql3 = 'INSERT INTO Players(' +
								'PUBLIC_ID, ' +
								'PLAYER_NICK, ' +
								'PLAYER_CLAN, ' +
								'PLAYER_COUNTRY, ' +
								'RANK, ' +
								'SCORE, ' +
								'QUIT, ' +
								'DAMAGE_DEALT, ' +
								'DAMAGE_TAKEN, ' +
								'KILLS, ' +
								'DEATHS, ' +
								'HITS, ' +
								'SHOTS, ' +
								'TEAM, ' +
								'TEAM_RANK, ' +
								'HUMILIATION, ' +
								'IMPRESSIVE, ' +
								'EXCELLENT, ' +
								'PLAY_TIME, ' +

								'G_A, ' +
								'G_H, ' +
								'G_K, ' +
								'G_S, ' +

								'GL_A, ' +
								'GL_H, ' +
								'GL_K, ' +
								'GL_S, ' +

								'LG_A, ' +
								'LG_H, ' +
								'LG_K, ' +
								'LG_S, ' +

								'MG_A, ' +
								'MG_H, ' +
								'MG_K, ' +
								'MG_S, ' +

								'PG_A, ' +
								'PG_H, ' +
								'PG_K, ' +
								'PG_S, ' +

								'RG_A, ' +
								'RG_H, ' +
								'RG_K, ' +
								'RG_S, ' +

								'RL_A, ' +
								'RL_H, ' +
								'RL_K, ' +
								'RL_S, ' +

								'SG_A, ' +
								'SG_H, ' +
								'SG_K, ' +
								'SG_S' +

								') values( ';
							var sql4 = '' +
								'\"' + j.PUBLIC_ID + '\",' +
								'\"' + p.PLAYER_NICK + '\",' +
								'\"' + p.PLAYER_CLAN + '\",' +
								'\"' + p.PLAYER_COUNTRY + '\",' +
								'' + p.RANK + ',' +
								'' + p.SCORE + ',' +
								'' + p.QUIT + ',' +
								'' + p.DAMAGE_DEALT + ',' +
								'' + p.DAMAGE_TAKEN + ',' +
								'' + p.KILLS + ',' +
								'' + p.DEATHS + ',' +
								'' + p.HITS + ',' +
								'' + p.SHOTS + ',' +
								'\"' + p.TEAM + '\",' +
								'' + p.TEAM_RANK + ',' +
								'' + p.HUMILIATION + ',' +
								'' + IMPRESSIVE + ',' +
								'' + EXCELLENT + ',' +
								'' + p.PLAY_TIME + ',' +

								'' + p.GAUNTLET_ACCURACY + ',' +
								'' + p.GAUNTLET_HITS + ',' +
								'' + p.GAUNTLET_KILLS + ',' +
								'' + p.GAUNTLET_SHOTS + ',' +

								'' + p.GRENADE_ACCURACY + ',' +
								'' + p.GRENADE_HITS + ',' +
								'' + p.GRENADE_KILLS + ',' +
								'' + p.GRENADE_SHOTS + ',' +

								'' + p.LIGHTNING_ACCURACY + ',' +
								'' + p.LIGHTNING_HITS + ',' +
								'' + p.LIGHTNING_KILLS + ',' +
								'' + p.LIGHTNING_SHOTS + ',' +

								'' + p.MACHINEGUN_ACCURACY + ',' +
								'' + p.MACHINEGUN_HITS + ',' +
								'' + p.MACHINEGUN_KILLS + ',' +
								'' + p.MACHINEGUN_SHOTS + ',' +

								'' + p.PLASMA_ACCURACY + ',' +
								'' + p.PLASMA_HITS + ',' +
								'' + p.PLASMA_KILLS + ',' +
								'' + p.PLASMA_SHOTS + ',' +

								'' + p.RAILGUN_ACCURACY + ',' +
								'' + p.RAILGUN_HITS + ',' +
								'' + p.RAILGUN_KILLS + ',' +
								'' + p.RAILGUN_SHOTS + ',' +

								'' + p.ROCKET_ACCURACY + ',' +
								'' + p.ROCKET_HITS + ',' +
								'' + p.ROCKET_KILLS + ',' +
								'' + p.ROCKET_SHOTS + ',' +

								'' + p.SHOTGUN_ACCURACY + ',' +
								'' + p.SHOTGUN_HITS + ',' +
								'' + p.SHOTGUN_KILLS + ',' +
								'' + p.SHOTGUN_SHOTS +
								')';
							//console.log( i + " " + sql3 );
							//console.log( i + " " + sql4 );
							db.query( sql3 + sql4, function _db_query_red( err, rows, fields ) {
								if( err ) { throw err; }
							} );
						}
						for( var i in j.SCOREBOARD ) {
							var p = j.SCOREBOARD[i];
							var IMPRESSIVE = 0;
							var EXCELLENT = 0;
							var QUIT = 0;
							var TEAM_RANK = 0;
							if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
							if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
							if( typeof p.QUIT !== 'undefined' ) { QUIT = p.QUIT; }
							if( typeof p.TEAM_RANK !== 'undefined' ) { TEAM_RANK = p.TEAM_RANK; }
							//console.log( j.PUBLIC_ID + " " + p.PLAYER_NICK + " " + p.TEAM );
							var sql3 = 'INSERT INTO Players(' +
								'PUBLIC_ID, ' +
								'PLAYER_NICK, ' +
								'PLAYER_CLAN, ' +
								'PLAYER_COUNTRY, ' +
								'RANK, ' +
								'SCORE, ' +
								'QUIT, ' +
								'DAMAGE_DEALT, ' +
								'DAMAGE_TAKEN, ' +
								'KILLS, ' +
								'DEATHS, ' +
								'HITS, ' +
								'SHOTS, ' +
								'TEAM, ' +
								'TEAM_RANK, ' +
								'HUMILIATION, ' +
								'IMPRESSIVE, ' +
								'EXCELLENT, ' +
								'PLAY_TIME, ' +

								'G_A, ' +
								'G_H, ' +
								'G_K, ' +
								'G_S, ' +

								'GL_A, ' +
								'GL_H, ' +
								'GL_K, ' +
								'GL_S, ' +

								'LG_A, ' +
								'LG_H, ' +
								'LG_K, ' +
								'LG_S, ' +

								'MG_A, ' +
								'MG_H, ' +
								'MG_K, ' +
								'MG_S, ' +

								'PG_A, ' +
								'PG_H, ' +
								'PG_K, ' +
								'PG_S, ' +

								'RG_A, ' +
								'RG_H, ' +
								'RG_K, ' +
								'RG_S, ' +

								'RL_A, ' +
								'RL_H, ' +
								'RL_K, ' +
								'RL_S, ' +

								'SG_A, ' +
								'SG_H, ' +
								'SG_K, ' +
								'SG_S' +

								') values( ';
							var sql4 = '' +
								'\"' + j.PUBLIC_ID + '\",' +
								'\"' + p.PLAYER_NICK + '\",' +
								'\"' + p.PLAYER_CLAN + '\",' +
								'\"' + p.PLAYER_COUNTRY + '\",' +
								'' + p.RANK + ',' +
								'' + p.SCORE + ',' +
								'' + QUIT + ',' +
								'' + p.DAMAGE_DEALT + ',' +
								'' + p.DAMAGE_TAKEN + ',' +
								'' + p.KILLS + ',' +
								'' + p.DEATHS + ',' +
								'' + p.HITS + ',' +
								'' + p.SHOTS + ',' +
								'\"' + p.TEAM + '\",' +
								'' + TEAM_RANK + ',' +
								'' + p.HUMILIATION + ',' +
								'' + IMPRESSIVE + ',' +
								'' + EXCELLENT + ',' +
								'' + p.PLAY_TIME + ',' +

								'' + p.GAUNTLET_ACCURACY + ',' +
								'' + p.GAUNTLET_HITS + ',' +
								'' + p.GAUNTLET_KILLS + ',' +
								'' + p.GAUNTLET_SHOTS + ',' +

								'' + p.GRENADE_ACCURACY + ',' +
								'' + p.GRENADE_HITS + ',' +
								'' + p.GRENADE_KILLS + ',' +
								'' + p.GRENADE_SHOTS + ',' +

								'' + p.LIGHTNING_ACCURACY + ',' +
								'' + p.LIGHTNING_HITS + ',' +
								'' + p.LIGHTNING_KILLS + ',' +
								'' + p.LIGHTNING_SHOTS + ',' +

								'' + p.MACHINEGUN_ACCURACY + ',' +
								'' + p.MACHINEGUN_HITS + ',' +
								'' + p.MACHINEGUN_KILLS + ',' +
								'' + p.MACHINEGUN_SHOTS + ',' +

								'' + p.PLASMA_ACCURACY + ',' +
								'' + p.PLASMA_HITS + ',' +
								'' + p.PLASMA_KILLS + ',' +
								'' + p.PLASMA_SHOTS + ',' +

								'' + p.RAILGUN_ACCURACY + ',' +
								'' + p.RAILGUN_HITS + ',' +
								'' + p.RAILGUN_KILLS + ',' +
								'' + p.RAILGUN_SHOTS + ',' +

								'' + p.ROCKET_ACCURACY + ',' +
								'' + p.ROCKET_HITS + ',' +
								'' + p.ROCKET_KILLS + ',' +
								'' + p.ROCKET_SHOTS + ',' +

								'' + p.SHOTGUN_ACCURACY + ',' +
								'' + p.SHOTGUN_HITS + ',' +
								'' + p.SHOTGUN_KILLS + ',' +
								'' + p.SHOTGUN_SHOTS +
								')';
							//console.log( i + " " + sql3 );
							//console.log( i + " " + sql4 );
							db.query( sql3 + sql4, function _db_query_scoreboard( err, rows, fields ) {
								if( err ) { throw err; }
							} );
						}
					}
				} );
			}
			*/
		} );
	} );
	res.jsonp( { doing: "it" } );
	res.end();
} );

app.listen( 8787 );


function _size( bytes, precision ) {
	if( isNaN( parseFloat( bytes ) ) || !isFinite( bytes ) ) return '-';
	if( typeof precision === 'undefined' ) precision = 1;
	var units = [ 'b', 'kB', 'MB', 'GB', 'TB', 'PB' ];
	var number = Math.floor( Math.log( bytes) / Math.log( 1024 ) );
	return ( bytes / Math.pow( 1024, Math.floor( number ) ) ).toFixed( precision ) +  ' ' + units[number];
}

