
var glicko2 = require( 'glicko2' );
var fs = require( 'fs' )
	, log4js = require( 'log4js' )
	, mysql = require( 'mysql' )
	, Q = require( 'q' )
;

_logger = log4js.getLogger( "glicko" );
_logger.setLevel( log4js.levels.DEBUG );

// read cfg.json
var data = fs.readFileSync( __dirname + '/cfg.json' );
var cfg;
try {
	cfg = JSON.parse( data );
	_logger.info( 'Parsed config file' );
}
catch( err ) {
	_logger.error( 'failed to parse cfg: ' + err );
}

//multipleStatements: true,
cfg.mysql_db.multipleStatements = true;
cfg.mysql_db.waitForConnections = false;
cfg.mysql_db.connectionLimit = 15;
var dbpool = mysql.createPool( cfg.mysql_db );

var glickoSettings = {
	tau: 0.5,
	rating: 1500,
	rd: 35,
	vol: 0.06,
}

var ranking = new glicko2.Glicko2( glickoSettings );

var players = [];
var matches = [];
var temp_matches = [];

// get all players
sql = 'select ID, NAME from Player';
dbpool.getConnection( function( err, conn ) {
	if( err ) { _logger.error( err ); }
	conn.query( sql, function( err, rows ) {
		if( err ) { _logger.error( err ); }
		_logger.info( 'fetched ' + rows.length + ' players.' );
		// add all players
		for( var i in rows ) {
			players[rows[i].ID] = rows[i];
			players[rows[i].ID].rank = ranking.makePlayer();
		}
		_logger.info( 'made ' + players.length + ' ranked players.' );
		_GamePlayer();
		//process.exit();
		conn.release();
	} );
} );

function _GamePlayer() {
	//sql = 'select g.PUBLIC_ID, gp.PLAYER_ID, gp.RANK from GamePlayer gp left join Game g on g.ID=gp.GAME_ID where g.GAME_TYPE="duel" and GAME_TIMESTAMP>UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) ';
	sql = 'select g.PUBLIC_ID, gp.PLAYER_ID, gp.RANK from GamePlayer gp left join Game g on g.ID=gp.GAME_ID where g.GAME_TYPE="duel" and GAME_TIMESTAMP<UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 30 day ) ) and GAME_TIMESTAMP>UNIX_TIMESTAMP( DATE_SUB( NOW(), INTERVAL 60 day ) ) ';
	dbpool.getConnection( function( err, conn ) {
		if( err ) { _logger.error( err ); }
		conn.query( sql, function( err, rows ) {
			if( err ) { _logger.error( err ); }
			_logger.info( 'fetched ' + rows.length + ' GamePlayer rows.' );
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
					//_logger.debug( 'undefined: ' + i );
				}
			}
			_logger.info( 'adding ' + matches.length + ' matches! ' + c + ' matches failed.' );
			ranking.updateRatings( matches );
			// print rank of some random noobs:
			_logger.info( players[10673].NAME + ': ' + players[10673].rank.getRating() + ', ' + players[10673].rank.getRd() + ', ' + players[10673].rank.getVol() ); // opazor
			_logger.info( players[2577].NAME + ': ' + players[2577].rank.getRating() + ', ' + players[2577].rank.getRd() + ', ' + players[2577].rank.getVol() ); // traffy
			_logger.info( players[865].NAME + ': ' + players[865].rank.getRating() + ', ' + players[865].rank.getRd() + ', ' + players[865].rank.getVol() ); // cypher
			_logger.info( players[6380].NAME + ': ' + players[6380].rank.getRating() + ', ' + players[6380].rank.getRd() + ', ' + players[6380].rank.getVol() ); // evil
			_logger.info( players[14061].NAME + ': ' + players[14061].rank.getRating() + ', ' + players[14061].rank.getRd() + ', ' + players[14061].rank.getVol() ); // rapha
			_logger.info( players[17976].NAME + ': ' + players[17976].rank.getRating() + ', ' + players[17976].rank.getRd() + ', ' + players[17976].rank.getVol() ); // k1llsen
			//var playerRankings = ranking.getPlayers();
			/*
			fs.writeFile( '/tmp/players.json', JSON.stringify( players ), function( err ) {
				if( err ) { _logger.error( err ); }
				fs.writeFile( '/tmp/playerRankings.json', JSON.stringify( playerRankings ), function( err ) {
					if( err ) { _logger.error( err ); }
					_logger.debug( 'wrote file playerRankings.' );
					process.exit();
				} );
				_logger.debug( 'wrote file players.' );
			} );
			*/
			var plRanksArr = [];
			var plRanksObj = {};
			for( var i in players ) {
				p = players[i];
				plRanksArr.push( { id: i, name: p.NAME, score: p.rank.getRating(), rd: p.rank.getRd(), vol: p.rank.getVol() } );
			}
			plRanksArr.sort( function( a, b ) {
				return b.score - a.score;
			} );
			var prettyPrint = "";
			for( var i in plRanksArr ) {
				plRanksArr[i].rank = i;
				prettyPrint += plRanksArr[i].rank + '. ' + plRanksArr[i].name + ' ( ' + plRanksArr[i].score + " )";
				prettyPrint += "\n";
			}
			fs.writeFile( '/tmp/prettyrank.json', prettyPrint, function( err ) {
				if( err ) { _logger.error( err ); }
				_logger.info( 'wrote prettyranks' );
				process.exit();
			} );
			/*
			fs.writeFile( '/tmp/ranks.json', JSON.stringify( plRanksArr, null, 2 ), function( err ) {
				if( err ) { _logger.error( err ); }
				_logger.info( 'wrote ranks.json' );
			} );
			*/
			conn.release();
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


