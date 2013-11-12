
var request = require( 'request' );
var cheerio = require( 'cheerio' );
var fs = require( 'fs' );
var mysql = require( 'mysql' );
var express = require( 'express' );
var app = express();
app.enable( "jsonp callback" );
var http = require( 'http' );
var url = require( 'url' );
var server = http.createServer( app );
var zlib = require( 'zlib' );

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
	database: cfg.mysql_db.database,
	user: cfg.mysql_db.user,
	password: cfg.mysql_db.password,
	multipleStatements: true,
} );
db.connect();

setInterval( function() {
	db.ping();
}, 5000*1000 );

function elapsed_time2( timer ) {
	var precision = 3; // 3 decimal places
	var elapsed = process.hrtime( timer )[1] / 1000000; // divide by a million to get nano to milli
	//nlog.log( 'info', elapsed.toFixed( precision ) + ' ms - ' + note );
	timer = process.hrtime(); // reset the timer
	return parseFloat( elapsed.toFixed( precision ) );
}
var MyRequestsCompleted = ( function() {
	var numRequestToComplete, requestsCompleted, callBacks, singleCallBack;
	return function( options ) {
		if( !options ) {
			options = {};
		}
		numRequestToComplete = options.numRequest || 0;
		requestsCompleted = options.requestsCompleted || 0;
		callBacks = [];
		var fireCallbacks = function () {
			console.log( "we're all complete" );
			for( var i = 0; i < callBacks.length; i++ ) {
				callBacks[i]();
			}
		};
		if( options.singleCallback ) {
			callBacks.push( options.singleCallback );
		}
		this.addCallbackToQueue = function( isComplete, callback ) {
			if( isComplete ) requestsCompleted++;
			if( callback ) callBacks.push( callback );
			if( requestsCompleted == numRequestToComplete ) fireCallbacks();
		};
		this.requestComplete = function( isComplete ) {
			if( isComplete ) requestsCompleted++;
			if( requestsCompleted == numRequestToComplete ) {
				fireCallbacks();
			}
		};
		this.setCallback = function( callback ) {
			callBacks.push( callBack );
		};
	};
} )();

// move games dir to public? or make an app.get
app.use( express.static( __dirname + '/public' ) );
app.use( '/get/game', express.static( __dirname + '/games' ) );

app.get( '/stats', function ( req, res ) {
	var timer_start = process.hrtime();
	var cmds = [
	{ cmd: 'stats/players/', descr: 'lists all players' },
	{ cmd: 'stats/player/<PLAYER_NICK>', descr: 'player info', example_url: 'stats/player/rulex' },
	{ cmd: 'stats/player/<PLAYER_NICK>/update', descr: 'update player matches from quakelive.com', example_url: 'stats/player/rulex/update' },
	{ cmd: 'stats/player/<PLAYER_NICK>/games', descr: 'list all games recorded of player', example_url: 'stats/player/rulex/games' },
	{ cmd: 'stats/games/', descr: 'lists games, last 1000' },
	//{ cmd: 'stats/games/type/<GAME_TYPE>', descr: 'lists games by gametype, last 1000', example_url: 'stats/games/type/ca' },
	//{ cmd: 'stats/games/owner/<OWNER>', descr: 'lists games by server owner, last 1000', example_url: 'stats/games/owner/rul3x' },
	{ cmd: 'stats/game/<PUBLIC_ID>', descr: 'game info' }
];
	res.jsonp( cmds );
	res.end();
	console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
} );
app.get( '/stats/players', function ( req, res ) {
	var timer_start = process.hrtime();
	var sql = 'select Players.PLAYER_NICK as PLAYER_NICK, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, max(Games.GAME_TIMESTAMP) as GAME_TIMESTAMP, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(Players.KILLS) as KILLS, sum(Players.DEATHS) as DEATHS, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO,sum(Players.HITS) as HITS,avg(Players.HITS) as HITS_AVG,sum(Players.SHOTS) as SHOTS,avg(Players.SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, sum(Players.PLAY_TIME) as PLAY_TIME,sum(Players.EXCELLENT) as EXCELLENT_SUM, avg(Players.EXCELLENT) as EXCELLENT_AVG, sum(Players.IMPRESSIVE) as IMPRESSIVE_SUM, avg(Players.IMPRESSIVE) as IMPRESSIVE_AVG,sum(Players.HUMILIATION) as HUMILIATION_SUM, avg(Players.HUMILIATION) as HUMILIATION_AVG,sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT,avg(Players.DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN, avg(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID GROUP BY Players.PLAYER_NICK ORDER BY NULL LIMIT 500;';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( { theplayers: rows } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/player/*/games', function ( req, res ) {
	var queryObject = url.parse( req.url, true ).query;
	var timer_start = process.hrtime();
	var nick = mysql_real_escape_string( req.url.split( '/' )[3] );
	var sql = 'select Games.PUBLIC_ID, Games.GAME_TIMESTAMP, Games.GAME_TYPE, Games.OWNER, Players.PLAYER_NICK from Games left join Players on Games.PUBLIC_ID=Players.PUBLIC_ID where Players.PLAYER_NICK="'+ nick +'" order by NULL';
	//console.log( sql );
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( { thegames: rows } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
	//console.log( nick );
} );
app.get( '/stats/player/*/update', function ( req, res ) {
	var timer_start = process.hrtime();
	var nick = req.url.split( '/' )[3];
	var d = new Date();
	//console.log( 'updating ' + nick + '...' );
	var url = 'http://www.quakelive.com/profile/matches_by_week/' + nick + '/' + d.getFullYear() + '-' + ( d.getMonth() + 1 ) + '-' + d.getUTCDate();
	var url2 = 'http://www.quakelive.com/stats/matchdetails/' + "";
	var newgames = [];
	var foundgames = [];
	request( url, function( err, resp, body ) {
		if( err ) { throw err; }
		$ = cheerio.load( body );
		var lastgame = "";
		var lastgames = [];
		var _lastgame = $( '.areaMapC' ).length-1;
		var nrcallbacks = $( '.areaMapC' ).length;
		if( nrcallbacks == 0 ) {
			res.jsonp( { player: nick, updated: 0, scanned: nrcallbacks, updated_games: lastgames } );
			return;
		}
		console.log( nrcallbacks );
		var requestCallback = new MyRequestsCompleted( {
			numRequest: nrcallbacks,
			singleCallback: function() {
				//console.log( "I'm the callback" );
				console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
				res.jsonp( { player: nick, updated: lastgames.length, scanned: nrcallbacks, updated_games: lastgames } );
				res.end();
			}
		} );
		$( '.areaMapC' ).each( function( i ) {
			//if( _lastgame == i ) { res.jsonp( { nick: nick, games_added: newgames } ); }
			lastgame = $(this).attr( 'id' ).split( '_' )[1];
			foundgames.push( lastgame );
			var lstg = lastgame;
			db.query( 'SELECT PUBLIC_ID FROM Games WHERE PUBLIC_ID=\''+ lastgame +'\'', function( err, rows, fields ) {
				if( err ) { throw err; }
				if( rows.length > 0 ) {
					requestCallback.requestComplete( true );
				}
				else {
					request( url2 + lstg, function( err, resp, body ) {
						console.log( );
						console.log( body );
						console.log( );
						var j = JSON.parse( body );
						// save to disk
						if( j.UNAVAILABLE != 1 ) {
							//
							fs.writeFile( './games/' + j.PUBLIC_ID + '.json', body, function( err ) {
								if( err ) { console.log( err ); }
								else {
									console.log( "saved " + j.PUBLIC_ID );
									newgames.push( j.PUBLIC_ID );
									var gzip = zlib.createGzip();
									var inp = fs.createReadStream( './games/' + j.PUBLIC_ID + '.json' );
									var out = fs.createWriteStream( './games/' + j.PUBLIC_ID + '.json.gz' );
									inp.pipe( gzip ).pipe( out );
									fs.unlink( './games/' + j.PUBLIC_ID + '.json' );
								}
							} );
							//
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
							console.log( sql1 );
							console.log( sql2 );
							db.query( sql1 + sql2, function( err, rows, fields ) {
								if( err ) { throw err; }
								else {
									lastgames.push( { PUBLIC_ID: j.PUBLIC_ID, MAP: j.MAP, OWNER: j.OWNER, GAME_TYPE: j.GAME_TYPE, GAME_TIMESTAMP: new Date( j.GAME_TIMESTAMP ).getTime()/1000, GAME_TIMESTAMP2: j.GAME_TIMESTAMP, GAME_TIMESTAMP_NICE: j.GAME_TIMESTAMP_NICE } );
									requestCallback.requestComplete( true );
									//res.jsonp( { nick: nick, update_games:  } );
								}
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
									'G_K, ' +
									'GL_H, ' +
									'GL_K, ' +
									'GL_S, ' +
									'LG_H, ' +
									'LG_K, ' +
									'LG_S, ' +
									'MG_H, ' +
									'MG_K, ' +
									'MG_S, ' +
									'PG_H, ' +
									'PG_K, ' +
									'PG_S, ' +
									'RG_H, ' +
									'RG_K, ' +
									'RG_S, ' +
									'RL_H, ' +
									'RL_K, ' +
									'RL_S, ' +
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
									'' + p.GAUNTLET_KILLS + ',' +
									'' + p.GRENADE_HITS + ',' +
									'' + p.GRENADE_KILLS + ',' +
									'' + p.GRENADE_SHOTS + ',' +
									'' + p.LIGHTNING_HITS + ',' +
									'' + p.LIGHTNING_KILLS + ',' +
									'' + p.LIGHTNING_SHOTS + ',' +
									'' + p.MACHINEGUN_HITS + ',' +
									'' + p.MACHINEGUN_KILLS + ',' +
									'' + p.MACHINEGUN_SHOTS + ',' +
									'' + p.PLASMA_HITS + ',' +
									'' + p.PLASMA_KILLS + ',' +
									'' + p.PLASMA_SHOTS + ',' +
									'' + p.RAILGUN_HITS + ',' +
									'' + p.RAILGUN_KILLS + ',' +
									'' + p.RAILGUN_SHOTS + ',' +
									'' + p.ROCKET_HITS + ',' +
									'' + p.ROCKET_KILLS + ',' +
									'' + p.ROCKET_SHOTS + ',' +
									'' + p.SHOTGUN_HITS + ',' +
									'' + p.SHOTGUN_KILLS + ',' +
									'' + p.SHOTGUN_SHOTS +
									')';
								console.log( i + " " + sql3 );
								console.log( i + " " + sql4 );
								db.query( sql3 + sql4, function( err, rows, fields ) {
									if( err ) {
										throw err;
									}
								} );
							}
							for( var i in j.RED_SCOREBOARD ) {
								var p = j.RED_SCOREBOARD[i];
								var IMPRESSIVE = 0;
								var EXCELLENT = 0;
								if( typeof p.IMPRESSIVE !== 'undefined' ) { IMPRESSIVE = p.IMPRESSIVE; }
								if( typeof p.EXCELLENT !== 'undefined' ) { EXCELLENT = p.EXCELLENT; }
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
									'G_K, ' +
									'GL_H, ' +
									'GL_K, ' +
									'GL_S, ' +
									'LG_H, ' +
									'LG_K, ' +
									'LG_S, ' +
									'MG_H, ' +
									'MG_K, ' +
									'MG_S, ' +
									'PG_H, ' +
									'PG_K, ' +
									'PG_S, ' +
									'RG_H, ' +
									'RG_K, ' +
									'RG_S, ' +
									'RL_H, ' +
									'RL_K, ' +
									'RL_S, ' +
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
									'' + p.GAUNTLET_KILLS + ',' +
									'' + p.GRENADE_HITS + ',' +
									'' + p.GRENADE_KILLS + ',' +
									'' + p.GRENADE_SHOTS + ',' +
									'' + p.LIGHTNING_HITS + ',' +
									'' + p.LIGHTNING_KILLS + ',' +
									'' + p.LIGHTNING_SHOTS + ',' +
									'' + p.MACHINEGUN_HITS + ',' +
									'' + p.MACHINEGUN_KILLS + ',' +
									'' + p.MACHINEGUN_SHOTS + ',' +
									'' + p.PLASMA_HITS + ',' +
									'' + p.PLASMA_KILLS + ',' +
									'' + p.PLASMA_SHOTS + ',' +
									'' + p.RAILGUN_HITS + ',' +
									'' + p.RAILGUN_KILLS + ',' +
									'' + p.RAILGUN_SHOTS + ',' +
									'' + p.ROCKET_HITS + ',' +
									'' + p.ROCKET_KILLS + ',' +
									'' + p.ROCKET_SHOTS + ',' +
									'' + p.SHOTGUN_HITS + ',' +
									'' + p.SHOTGUN_KILLS + ',' +
									'' + p.SHOTGUN_SHOTS +
									')';
								console.log( i + " " + sql3 );
								console.log( i + " " + sql4 );
								db.query( sql3 + sql4, function( err, rows, fields ) {
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
									'G_K, ' +
									'GL_H, ' +
									'GL_K, ' +
									'GL_S, ' +
									'LG_H, ' +
									'LG_K, ' +
									'LG_S, ' +
									'MG_H, ' +
									'MG_K, ' +
									'MG_S, ' +
									'PG_H, ' +
									'PG_K, ' +
									'PG_S, ' +
									'RG_H, ' +
									'RG_K, ' +
									'RG_S, ' +
									'RL_H, ' +
									'RL_K, ' +
									'RL_S, ' +
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
									'' + p.GAUNTLET_KILLS + ',' +
									'' + p.GRENADE_HITS + ',' +
									'' + p.GRENADE_KILLS + ',' +
									'' + p.GRENADE_SHOTS + ',' +
									'' + p.LIGHTNING_HITS + ',' +
									'' + p.LIGHTNING_KILLS + ',' +
									'' + p.LIGHTNING_SHOTS + ',' +
									'' + p.MACHINEGUN_HITS + ',' +
									'' + p.MACHINEGUN_KILLS + ',' +
									'' + p.MACHINEGUN_SHOTS + ',' +
									'' + p.PLASMA_HITS + ',' +
									'' + p.PLASMA_KILLS + ',' +
									'' + p.PLASMA_SHOTS + ',' +
									'' + p.RAILGUN_HITS + ',' +
									'' + p.RAILGUN_KILLS + ',' +
									'' + p.RAILGUN_SHOTS + ',' +
									'' + p.ROCKET_HITS + ',' +
									'' + p.ROCKET_KILLS + ',' +
									'' + p.ROCKET_SHOTS + ',' +
									'' + p.SHOTGUN_HITS + ',' +
									'' + p.SHOTGUN_KILLS + ',' +
									'' + p.SHOTGUN_SHOTS +
									')';
								console.log( i + " " + sql3 );
								console.log( i + " " + sql4 );
								db.query( sql3 + sql4, function( err, rows, fields ) {
									if( err ) { throw err; }
								} );
							}
						}
						else {
							requestCallback.requestComplete( true );
						}
					} );
				}
			}	);
		} );
	} );
} );
app.get( '/stats/player/*', function ( req, res ) {
	var timer_start = process.hrtime();
	var queryObject = url.parse( req.url, true ).query;
	var str1 = '';
	var str2 = '';
	if( queryObject.OWNER != undefined ) { str1 = ' Games.OWNER="' + queryObject.OWNER + '" and '; }
	if( queryObject.GAME_TYPE != undefined ) { str2 = ' Games.GAME_TYPE="' + queryObject.GAME_TYPE + '" and '; }
	var nick = mysql_real_escape_string( req.url.split( '/' )[3] );
	var sql = 'SELECT PLAYER_NICK, PLAYER_CLAN, PLAYER_COUNTRY, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE '+str1+str2+' PLAYER_NICK=\''+ nick +'\' GROUP BY PLAYER_NICK order by NULL';
	//console.log( sql );
	db.query( sql, function( err, rows, fields ) {
		res.jsonp( rows );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
	//console.log( nick );
} );
app.get( '/stats/idealteams/*', function ( req, res ) {
	var timer_start = process.hrtime();
	console.log( req.url );
	var nicks = mysql_real_escape_string( req.url.split( '/' )[3] ).split( '+' );
	console.log( nicks );
	//var sql_nicks = nicks.join( ' ' );
	var sql_nicks = "";
	for( var n in nicks ) {
		if( n > 0 ) { sql_nicks = sql_nicks + " or "; }
		sql_nicks = sql_nicks + ' PLAYER_NICK="' + nicks[n] + '" ';
	}
	// #tdmpickup ratio = (avgNetFrags * 0.5 + avgNetDamage / 100 * 0.4 + avgDamageDone / 100 * 0.3) * (1 + (0.15 * (wins / matches - losses / matches)))
	var sql = 'select PLAYER_NICK, avg(AVG_ACC) as AVG_ACC, (avg(RL_A)+avg(RG_A)+avg(LG_A))/3 as RL_RG_LG_ACC, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, avg(SCORE) as SCORE_AVG, (sum(KILLS)/sum(DEATHS)) as RATIO, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(DAMAGE_DEALT)/sum(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="rul3x" and ( '+ sql_nicks +' ) group by PLAYER_NICK order by DAMAGE_DEALT_PER_SEC_AVG desc';
	console.log( sql_nicks );
	console.log( sql );
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( rows );
		res.end();
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/games/type/*', function ( req, res ) {
	var type = mysql_real_escape_string( req.url.split( '/' )[4] );
	var timer_start = process.hrtime();
	var sql = 'SELECT * FROM Games where GAME_TYPE="'+ type +'" order by GAME_TIMESTAMP desc LIMIT 500';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( rows );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/games/owner/*', function ( req, res ) {
	var owner = mysql_real_escape_string( req.url.split( '/' )[4] );
	var timer_start = process.hrtime();
	//var sql = 'SELECT * FROM Games WHERE OWNER=\'rul3x\' AND GAME_TYPE="ca" order by GAME_TIMESTAMP';
	var sql = 'SELECT * FROM Games where OWNER="'+ owner +'" order by GAME_TIMESTAMP desc LIMIT 500';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( { theowner: rows } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/games', function ( req, res ) {
	var timer_start = process.hrtime();
	var sql = 'SELECT * FROM Games order by GAME_TIMESTAMP desc LIMIT 500';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( { thegames: rows } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/game/*', function ( req, res ) {
	var timer_start = process.hrtime();
	var game = mysql_real_escape_string( req.url.split( '/' )[3] );
	var sql = [];
	sql[0] = 'SELECT * FROM Games WHERE PUBLIC_ID=\'' + game + '\'';
	sql[1] = 'SELECT * FROM Players WHERE PUBLIC_ID=\'' + game + '\'';
	//sql[2] = 'select Players.TEAM, count(Players.PLAYER_NICK) as PLAYERS, sum(Players.SCORE) as SCORE, avg(Players.SCORE) as SCORE_AVG, sum(Players.KILLS) as KILLS, sum(Players.DEATHS) as DEATHS, sum(Players.SHOTS) as SHOTS, sum(Players.HITS) as HITS, sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT_SUM, sum(Players.DAMAGE_DEALT)/sum(Games.GAME_LENGTH) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Players.PUBLIC_ID="'+ game +'" group by TEAM';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.jsonp( { game: resulty[0][0], teams: resulty[2], players: resulty[1] } );
		res.end();
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/owners', function ( req, res ) {
	var timer_start = process.hrtime();
	var sql = 'SELECT OWNER, count(*) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH_SUM, avg(GAME_LENGTH) as GAME_LENGTH_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS, avg(AVG_ACC) as AVG_ACC, sum(case when GAME_TYPE="duel" then 1 else 0 end) as duel, sum(case when GAME_TYPE="tdm" then 1 else 0 end) as tdm, sum(case when GAME_TYPE="ca" then 1 else 0 end) as ca FROM Games group by OWNER order by NULL';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( { theowners: rows } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/owner/*', function ( req, res ) {
	var owner = mysql_real_escape_string( req.url.split( '/' )[3] );
	var timer_start = process.hrtime();
	//var sql = 'SELECT * FROM Games WHERE OWNER=\'rul3x\' AND GAME_TYPE="ca" order by GAME_TIMESTAMP';
	var sql = [];
	sql[0] = 'SELECT OWNER, count(*) as MATCHES_PLAYED, sum(PREMIUM) as PREMIUM_COUNT, avg(GAME_LENGTH) as GAME_LENGTH_AVG,  sum(GAME_LENGTH) as GAME_LENGTH_SUM,avg(NUM_PLAYERS) as NUM_PLAYERS_AVG, avg(TOTAL_KILLS) as TOTAL_KILLS_AVG, sum(TOTAL_KILLS) as TOTAL_KILLS_SUM, avg(DMG_DELIVERED_NUM) as DMG_DELIVERED_NUM_AVG, avg(TSCORE0) as TSCORE0_AVG, avg(TSCORE1) as TSCORE1_AVG FROM Games where OWNER="'+ owner +'" order by GAME_TIMESTAMP desc LIMIT 500';
	// maps
	sql[1] = 'select MAP, count(*) as MATCHES_PLAYED from Games where OWNER="'+ owner +'" group by MAP order by NULL';
	// unique players
	sql[2] = 'select count(*) as UNIQUE_PLAYERS from ( select PLAYER_NICK from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by PLAYER_NICK order by NULL ) as a';
	// game types
	sql[3] = 'select count(*) as MATCHES_PLAYED, GAME_TYPE from Games where OWNER="'+ owner +'" group by GAME_TYPE order by NULL';
	// players
	sql[4] = 'select Players.PLAYER_NICK, count(*) as MATCHES_PLAYED, avg( Players.HITS/Players.SHOTS*100 ) as ACC, sum( PLAY_TIME ) as PLAY_TIME, sum( KILLS ) as KILLS from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID where Games.OWNER="'+ owner +'" group by Players.PLAYER_NICK order by NULL';
	db.query( sql.join( ';' ), function( err, resulty ) {
		//console.log( rows );
		res.jsonp( { asdf: resulty[2], sum: resulty[0], types: resulty[3], maps: resulty[1], players: resulty[4] } );
		res.end();
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/types', function ( req, res ) {
	var timer_start = process.hrtime();
	//var sql = 'SELECT * FROM Games WHERE OWNER=\'rul3x\' AND GAME_TYPE="ca" order by GAME_TIMESTAMP';
	var sql = 'SELECT GAME_TYPE, count(*) as MATCHES_PLAYED, sum(GAME_LENGTH) as GAME_LENGTH_SUM, avg(GAME_LENGTH) as GAME_LENGTH_AVG, avg(AVG_ACC) as AVG_ACC FROM Games group by GAME_TYPE order by MATCHES_PLAYED desc';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( rows );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/clans', function ( req, res ) {
	var timer_start = process.hrtime();
	var sql = 'select Players.PLAYER_CLAN as PLAYER_CLAN, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(Players.KILLS) as KILLS, sum(Players.DEATHS) as DEATHS, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO,sum(Players.HITS) as HITS, avg(Players.HITS) as HITS_AVG,sum(Players.SHOTS) as SHOTS,avg(Players.SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, sum(Players.PLAY_TIME) as PLAY_TIME,sum(Players.EXCELLENT) as EXCELLENT_SUM, avg(Players.EXCELLENT) as EXCELLENT_AVG, sum(Players.IMPRESSIVE) as IMPRESSIVE_SUM, avg(Players.IMPRESSIVE) as IMPRESSIVE_AVG,sum(Players.HUMILIATION) as HUMILIATION_SUM, avg(Players.HUMILIATION) as HUMILIATION_AVG,sum(Players.DAMAGE_DEALT) as DAMAGE_DEALT,avg(Players.DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN, avg(Players.DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID GROUP BY Players.PLAYER_CLAN ORDER BY NULL';
	db.query( sql, function( err, rows, fields ) {
		//console.log( rows );
		res.jsonp( { theclans: rows } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/clan/*', function ( req, res ) {
	var str1 = '';
	var str2 = '';
	var timer_start = process.hrtime();
	var clan = decodeURI( req.url.split( '/' )[3] );
	var sql = [];
	sql[0] = 'SELECT PLAYER_CLAN, count(*) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE '+str1+str2+' PLAYER_CLAN=\''+ clan +'\' GROUP BY PLAYER_CLAN';
	sql[1] = 'SELECT PLAYER_NICK, count(PLAYER_NICK) as MATCHES_PLAYED, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end) as MATCHES_WON, sum(case when Players.TEAM = Games.WINNING_TEAM then 1 else 0 end)/count(*)*100 as WIN_PERCENT, sum(QUIT) as QUIT_SUM, avg(QUIT) as QUIT_AVG, avg(RANK) as RANK_AVG, sum(SCORE) as SCORE_SUM, avg(SCORE) as SCORE_AVG, sum(DAMAGE_DEALT) as DAMAGE_DEALT_SUM, avg(DAMAGE_DEALT) as DAMAGE_DEALT_AVG, avg(DAMAGE_DEALT)/avg(PLAY_TIME) as DAMAGE_DEALT_PER_SEC_AVG, sum(DAMAGE_TAKEN) as DAMAGE_TAKEN_SUM, avg(DAMAGE_TAKEN) as DAMAGE_TAKEN_AVG, avg(DAMAGE_DEALT-DAMAGE_TAKEN) as DAMAGE_NET_AVG, sum(KILLS) as KILLS_SUM, avg(KILLS) as KILLS_AVG, sum(DEATHS) as DEATHS_SUM, avg(DEATHS) as DEATHS_AVG, sum(Players.KILLS)/sum(Players.DEATHS) as RATIO, sum(HITS) as HITS_SUM, avg(HITS) as HITS_AVG, sum(SHOTS) as SHOTS_SUM, avg(SHOTS) as SHOTS_AVG, sum(HITS)/sum(SHOTS)*100 as ACC_AVG, avg(RANK) as RANK_AVG, avg(TEAM_RANK) as TEAM_RANK_AVG, sum(HUMILIATION) as HUMILIATION_SUM, avg(HUMILIATION) as HUMILIATION_AVG, sum(IMPRESSIVE) as IMPRESSIVE_SUM, avg(IMPRESSIVE) as IMPRESSIVE_AVG, sum(EXCELLENT) as EXCELLENT_SUM, avg(EXCELLENT) as EXCELLENT_AVG, sum(PLAY_TIME) as PLAY_TIME_SUM, avg(PLAY_TIME) as PLAY_TIME_AVG, sum(G_K) as G_K_SUM, avg(G_K) as G_K_AVG, sum(GL_H) as GL_H_SUM, avg(GL_H) as GL_H_AVG, sum(GL_K) as GL_K_SUM, avg(GL_K) as GL_K_AVG, sum(GL_S) as GL_S_SUM, avg(GL_S) as GL_S_AVG, sum(LG_H) as LG_H_SUM, avg(LG_H) as LG_H_AVG, sum(LG_K) as LG_K_SUM, avg(LG_K) as LG_K_AVG, sum(LG_S) as LG_S_SUM, avg(LG_S) as LG_S_AVG, sum(MG_H) as MG_H_SUM, avg(MG_H) as MG_H_AVG, sum(MG_K) as MG_K_SUM, avg(MG_K) as MG_K_AVG, sum(MG_S) as MG_S_SUM, avg(MG_S) as MG_S_AVG, sum(PG_H) as PG_H_SUM, avg(PG_H) as PG_H_AVG, sum(PG_K) as PG_K_SUM, avg(PG_K) as PG_K_AVG, sum(PG_S) as PG_S_SUM, avg(PG_S) as PG_S_AVG, sum(RG_H) as RG_H_SUM, avg(RG_H) as RG_H_AVG, sum(RG_K) as RG_K_SUM, avg(RG_K) as RG_K_AVG, sum(RG_S) as RG_S_SUM, avg(RG_S) as RG_S_AVG, sum(RL_H) as RL_H_SUM, avg(RL_H) as RL_H_AVG, sum(RL_K) as RL_K_SUM, avg(RL_K) as RL_K_AVG, sum(RL_S) as RL_S_SUM, avg(RL_S) as RL_S_AVG, sum(SG_H) as SG_H_SUM, avg(SG_H) as SG_H_AVG, sum(SG_K) as SG_K_SUM, avg(SG_K) as SG_K_AVG, sum(SG_S) as SG_S_SUM, avg(SG_S) as SG_S_AVG FROM Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID WHERE '+str1+str2+' PLAYER_CLAN=\''+ clan +'\' GROUP BY PLAYER_NICK, PLAYER_CLAN';
	db.query( sql.join( ';' ), function( err, resulty ) {
		//console.log( rows );
		res.jsonp( { theclan: resulty[0], theplayers: resulty[1] } );
		res.end();
		//apilog.log( 'info', 'GET', { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );
app.get( '/stats/all', function ( req, res ) {
	var timer_start = process.hrtime();
	//var game = mysql_real_escape_string( req.url.split( '/' )[3] );
	var sql = [];
	// games
	sql[0] = 'SELECT count(*) as MATCHES_PLAYED, SUM(TOTAL_KILLS) as TOTAL_KILLS, avg(AVG_ACC) as AVG_ACC FROM Games';
	// players
	sql[1] = 'SELECT sum(PLAY_TIME) as PLAY_TIME_SUM, sum(SHOTS) as SHOTS, sum(KILLS) as KILLS, sum(RL_K) as RL_K_SUM, sum(RG_K) as RG_K_SUM, sum(LG_K) as LG_K_SUM FROM Players ';
	// maps
	sql[2] = 'select count(*) as MATCHES_PLAYED, MAP from Games group by MAP order by MATCHES_PLAYED desc';
	// UNIQUE_PLAYERS
	sql[3] = 'select count(*) as UNIQUE_PLAYERS from ( select PLAYER_NICK from Players left join Games on Players.PUBLIC_ID=Games.PUBLIC_ID group by PLAYER_NICK ) as a';
	// first/latest game
	sql[4] = 'select min(GAME_TIMESTAMP) as min, max(GAME_TIMESTAMP) as max from Games';
	// types
	sql[5] = 'select GAME_TYPE, count(*) as MATCHES_PLAYED from Games group by GAME_TYPE order by MATCHES_PLAYED desc';
	db.query( sql.join( ';' ), function( err, resulty ) {
		res.jsonp( { games: resulty[0], UNIQUE_PLAYERS: resulty[3], min_max: resulty[4], gametypes: resulty[5], players: resulty[1], maps: resulty[2] } );
		res.end();
		console.log( { url: req.url, ms: elapsed_time2( timer_start ), from: req.connection.remoteAddress } );
	} );
} );

app.listen( cfg.api.port );

function mysql_real_escape_string( str ) {
	return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
		switch( char ) {
			case "\0":
				return "\\0";
			case "\x08":
				return "\\b";
			case "\x09":
				return "\\t";
			case "\x1a":
				return "\\z";
			case "\n":
				return "\\n";
			case "\r":
				return "\\r";
			case "\"":
			case "'":
			case "\\":
			case "%":
				return "\\"+char; // prepends a backslash to backslash, percent,
				// and double/single quotes
		}
	} );
}
