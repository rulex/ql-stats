
var glicko2 = require( 'glicko2' );
var fs = require( 'fs' )
	, log4js = require( 'log4js' )
	, mysql = require( 'mysql' )
	, Q = require( 'q' )
;
var program = require( 'commander' );
// changed starting figure temp for easier compare to qlranks initially
program
	.version( '0.0.1' )
	.option( '-c, --config <file>', 'Use a different config file. Default ./cfg.json' )
	.option( '-l, --loglevel <LEVEL>', 'Default is DEBUG. levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL' )
	.option( '-s, --start <timestamp>', 'Unix timestamp. Add games from this date' )
	.option( '-e, --end <timestamp>', 'Unix timestamp. Add games up to this date' )
	.option( '-t, --tau <Number>', 'Glicko2 tau value. Default 0.5' )
	.option( '-r, --rating <Number>', 'Glicko2 starting rating. Default 1250' )
	.option( '-d, --rd <Number>', 'Glicko2 rd value. Default 200' )
	.option( '-v, --vol <Number>', 'Glicko2 vol value. Default 0.06' )
	.option( '-o, --output <file>', '' )
	.parse( process.argv );

var _glickoLogger = log4js.getLogger( 'glicko' );
_glickoLogger.setLevel( program.loglevel || log4js.levels.DEBUG );

// read cfg.json
var data = fs.readFileSync( program.config || __dirname + '/cfg.json' );
var cfg;
try {
	cfg = JSON.parse( data );
	_glickoLogger.info( 'Parsed config file' );
}
catch( err ) {
	_glickoLogger.fatal( 'Failed to parse cfg: ' + err );
	process.exit();
}

//multipleStatements: true,
cfg.mysql_db.multipleStatements = true;
cfg.mysql_db.waitForConnections = false;
cfg.mysql_db.connectionLimit = 15;
var dbpool = mysql.createPool( cfg.mysql_db );

var glickoSettings = {
	tau: program.tau || 0.5,
	rating: program.rating || 1250,
	rd: program.rd || 200,
	vol: program.vol || 0.06,
}

_glickoLogger.debug( 'Glicko2 settings' );
_glickoLogger.debug( glickoSettings );
var ranking = new glicko2.Glicko2( glickoSettings );

var players = [];
var matches = [];
var temp_matches = [];

// get db status
var dbStatus = {};
dbpool.getConnection( function( err, conn ) {
	if( err ) { _glickoLogger.error( err ); }
	sql = 'SELECT TABLE_NAME, TABLE_ROWS  FROM INFORMATION_SCHEMA.TABLES  WHERE TABLE_SCHEMA=? ORDER BY TABLES.TABLE_ROWS DESC';
	conn.query( sql, [cfg.mysql_db.database], function( err, rows ) {
		if( err ) { _glickoLogger.error( err ); }
		_glickoLogger.info( 'fetched row count for tables' );
		_glickoLogger.debug( rows );
		dbStatus = rows;
	} );
} );

// get all players
dbpool.getConnection( function( err, conn ) {
	if( err ) { _glickoLogger.error( err ); }
	sql = 'select ID, NAME from Player';
	conn.query( sql, function( err, rows ) {
		if( err ) { _glickoLogger.error( err ); }
		_glickoLogger.info( 'fetched ' + rows.length + ' players.' );
		// add all players
		for( var i in rows ) {
			players[rows[i].ID] = {};
			players[rows[i].ID].ID = rows[i].ID;
			players[rows[i].ID].NAME = rows[i].NAME;
			players[rows[i].ID].rank = ranking.makePlayer();
		}
		_glickoLogger.info( 'made ' + players.length + ' ranked players.' );
		_GamePlayer();
		//process.exit();
		conn.release();
	} );
} );

// current competitive pool as of 13th sept 14
function _GamePlayer() {
	var duelMaps = [
		'aerowalk',
		'battleforged',
		'bloodrun',
		'campgrounds',
		'cure',
		'furiousheights',
		'lostworld',
		'sinister',
		'toxicity'
	];
	//var sql = 'select g.PUBLIC_ID, gp.PLAYER_ID, gp.RANK from GamePlayer gp left join Game g on g.ID=gp.GAME_ID where g.GAME_TYPE="duel" ';
	var sql = [];
	sql.push( 'select g.PUBLIC_ID, gp.PLAYER_ID, gp.RANK' );
	sql.push( 'from GamePlayer gp' );
	sql.push( 'left join Game g' );
	sql.push( 'on g.ID=gp.GAME_ID' );
	sql.push( 'left join Map m' );
	sql.push( 'on m.ID=g.MAP_ID' );
	//sql.push( 'where g.GAME_TIMESTAMP > 1409533332' );
	sql.push( 'where g.GAME_TYPE="duel"' );
	if( program.start )
		sql.push( 'and g.GAME_TIMESTAMP > ' + program.start );
	if( program.end )
		sql.push( 'and g.GAME_TIMESTAMP < ' + program.end );
	sql.push( 'and m.NAME in ( "' + duelMaps.join( '", "' ) + '" )' );
	sql.push( 'and g.RANKED=1' );
	// min accepted forfeit time 2 minutes 
	sql.push( 'and g.GAME_LENGTH > 120' );
	// add if afk and force ready check ie dmg < 300 or should be ok. will check later on average lowest dmg and place just under over 2 week result set
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _glickoLogger.error( err ); }
		conn.query( sql.join( ' ' ), function( err, rows ) {
			if( err ) { _glickoLogger.error( err ); }
			_glickoLogger.info( 'fetched ' + rows.length + ' GamePlayer rows.' );
			_glickoLogger.debug( sql.join( ' ' ) );
			// loop through all GamePlayer
			for( var i in rows ) {
				if( typeof temp_matches[rows[i].PUBLIC_ID] !== 'object' ) {
					// create object
					temp_matches[rows[i].PUBLIC_ID] = {};
				}
				if( rows[i].RANK === 1 ) {
					// add winning player to p1
					temp_matches[rows[i].PUBLIC_ID].p1 = rows[i].PLAYER_ID;
				}
				else {
					// add loser to p2
					temp_matches[rows[i].PUBLIC_ID].p2 = rows[i].PLAYER_ID;
				}
			}
			var c = 0;
			for( var i in temp_matches ) {
				if( 'p1' in temp_matches[i] && 'p2' in temp_matches[i] ) {
					// add to matches
					matches.push( [ players[temp_matches[i].p1].rank, players[temp_matches[i].p2].rank, 1 ] );
				}
				else {
					c++;
					//_glickoLogger.debug( 'undefined: ' + i );
				}
			}
			var d = new Date();
			var _date = d.getFullYear() + '-' + ( d.getMonth() + 1 ) + '-' + d.getUTCDate();
			_glickoLogger.info( 'adding ' + matches.length + ' matches! ' + c + ' matches failed.' );
			ranking.updateRatings( matches );
			// make a playerlist
			var playerList = [];
			for( var i in players ) {
				p = players[i];
				// only add players that have played matches
				if( p.rank.outcomes.length > 0 ) {
					_wins = 0;
					for( var j in p.rank.outcomes ) {
						_wins += p.rank.outcomes[j];
					}
					playerList.push( { ID: p.ID, NAME: p.NAME, ELO: p.rank.getRating(), MATCHES_PLAYED: p.rank.outcomes.length, WINS: _wins } );
				}
			}
			// sort the list
			playerList.sort( function( a, b ) { return ( b.ELO - a.ELO ); } );
			// add player rank to the list
			var _rank = 0;
			for( var i in playerList ) { playerList[i].RANK = ++_rank; }
			// print rank of some random noobs:
			_glickoLogger.info( players[10673].NAME + ': ' + players[10673].rank.getRating() + ', ' + players[10673].rank.getRd() + ', ' + players[10673].rank.getVol() ); // opazor
			_glickoLogger.info( players[2577].NAME + ': ' + players[2577].rank.getRating() + ', ' + players[2577].rank.getRd() + ', ' + players[2577].rank.getVol() ); // traffy
			_glickoLogger.info( players[865].NAME + ': ' + players[865].rank.getRating() + ', ' + players[865].rank.getRd() + ', ' + players[865].rank.getVol() ); // cypher
			_glickoLogger.info( players[6380].NAME + ': ' + players[6380].rank.getRating() + ', ' + players[6380].rank.getRd() + ', ' + players[6380].rank.getVol() ); // evil
			_glickoLogger.info( players[14061].NAME + ': ' + players[14061].rank.getRating() + ', ' + players[14061].rank.getRd() + ', ' + players[14061].rank.getVol() ); // rapha
			_glickoLogger.info( players[17976].NAME + ': ' + players[17976].rank.getRating() + ', ' + players[17976].rank.getRd() + ', ' + players[17976].rank.getVol() ); // k1llsen
			var output = [];
			var _file = program.output || '/tmp/glickodump.json';
			fs.writeFile( _file, JSON.stringify( { timestamp: d.getTime(), timestamp_nice: _date, glicko: glickoSettings, db: dbStatus, sql: sql.join( ' ' ), players: playerList }, undefined, 2 ), function( err ) {
				if( err ) { _glickoLogger.error( err ); }
				_glickoLogger.info( 'wrote output file: ' + _file );
				process.exit();
				conn.release();
			} );
		} );
	} );
}

/*
var ranking = new glicko2.Glicko2( glickoSettings );

var p1 = ranking.makePlayer();
var p2 = ranking.makePlayer();
var p3 = ranking.makePlayer();

var players = [];

players.push( { name: 'rulex', rank: ranking.makePlayer() } );
players.push( { name: 'rul3x', rank: ranking.makePlayer() } );
players.push( { name: 'rulle', rank: ranking.makePlayer() } );

var matches = [];

matches.push( [ players[0].rank,  players[1].rank, 1] );
matches.push( [ players[0].rank,  players[1].rank, 1] );
matches.push( [ players[0].rank,  players[1].rank, 1] );
matches.push( [ players[0].rank,  players[1].rank, 0] );
matches.push( [ players[0].rank,  players[1].rank, 1] );

matches.push( [ players[0].rank,  players[2].rank, 0] );
matches.push( [ players[1].rank,  players[2].rank, 0] );
matches.push( [ players[0].rank,  players[2].rank, 0] );

ranking.updateRatings( matches );

for( var i in players ) {
	console.log( players[i].name + ': ' + players[i].rank.getRating() + ', ' + players[i].rank.getRd() + ', ' + players[i].rank.getVol() );
}
*/

//console.log( players );


