
var fs = require( 'fs' )
	, log4js = require( 'log4js' )
	, mysql = require( 'mysql' )
	, Q = require( 'q' )
;

_logger = log4js.getLogger( "qlscache" );
_logger.setLevel( log4js.levels.DEBUG );

exports.init = function( ConfigFile ) {
	exports.file = ConfigFile.api.cache.file || './qlscache.json';
	exports.dir = ConfigFile.api.cache.dir || './cachedir/';
	exports.time = ConfigFile.api.cachetime || 60*60*1000;
	ConfigFile.mysql_db.multipleStatements = true;
	ConfigFile.mysql_db.waitForConnections = false;
	ConfigFile.mysql_db.connectionLimit = 15;
	exports.dbpool = mysql.createPool( ConfigFile.mysql_db );
	_logger.debug( 'Cache init, file:' + exports.file + ' dir:' + exports.dir + ' time:' + exports.time );
	exports.readCacheFile();
}
exports.readCacheFile = function() {
	try {
		var _data = fs.readFileSync( exports.file );
		exports.cacheControl = JSON.parse( _data );
		_logger.debug( 'Parsed Cache file' );
	}
	catch( err ) {
		_logger.warn( 'failed to parse cache file' );
		_logger.warn( err );
		exports.cacheControl = {};
		exports.writeCacheFile();
	}
}
exports.writeCacheFile = function() {
	fs.writeFile( exports.file, JSON.stringify( exports.cacheControl ), function( err ) {
		if( err ) {
			_logger.error( 'failed to write cache file ' + exports.file );
			_logger.error( err );
		}
		_logger.debug( 'wrote cache file ' + exports.file );
	} );
}
exports.checkRoute = function( apiRoute ) {
	var _filename = apiRoute.replace( /\//g, '' );
	_logger.debug( 'check cache ' + _filename );
	if( _filename in exports.cacheControl ) {
		_logger.debug( 'cache ' + _filename + ' exists' );
		if( exports.cacheControl[_filename].ts < new Date().getTime() ) {
			_logger.debug( 'cache ' + _filename + ' is old' );
			return 'OLD';
		}
		else {
			_logger.debug( 'cache ' + _filename + ' not old enough' );
			return 'FRESH';
		}
	}
	return 'MISSING';
}
exports.updateRoute = function( apiRoute ) {
	var _filename = apiRoute.replace( /\//g, '' );
	_logger.debug( 'updating cache for ' + _filename );
	exports.cacheControl[_filename] = { ts: new Date().getTime() + exports.time };
}
exports.writeCache = function( apiRoute, content ) {
	var _filename = apiRoute.replace( /\//g, '' );
	_logger.debug( 'wrote: ' + _filename );
	fs.writeFile( exports.dir + _filename, JSON.stringify( content ), function( err ) {
		if( err ) {
			_logger.error( 'failed to write cache ' + _filename );
			_logger.error( err );
		}
		_logger.debug( 'wrote cache ' + _filename );
		exports.updateRoute( apiRoute );
		exports.writeCacheFile();
	} );
}
exports.readCache = function( apiRoute ) {
	var _filename = apiRoute.replace( /\//g, '' );
	_logger.debug( 'read cache ' + _filename );
	try {
		var fileContent = fs.readFileSync( exports.dir + _filename );
		var json = JSON.parse( fileContent );
		return json;
	}
	catch( err ) {
		_logger.error( 'failed to read ' + _filename );
		_logger.error( err );
	}
}
function delay(ms) {
	var deferred = Q.defer();
	setTimeout( deferred.resolve, ms );
	return deferred.promise;
}
exports.query = function( sql, params, apiRoute ) {
	var _filename = apiRoute.replace( /\//g, '' );
	if( _filename in exports.cacheControl && exports.cacheControl[_filename].fetching === true ) {
		_logger.debug( 'fetching in progress' );
		return 1;
	}
	else {
		exports.updateRoute( apiRoute );
		exports.writeCacheFile();
		_logger.debug( 'query!' );
		var def = Q.defer();
		Q.ninvoke( exports.dbpool, "getConnection" )
			.then( function( conn ) {
				var deferred = Q.defer();
				_logger.debug( 'query conn!' );
				conn.query( sql, params, function( err, rows ) {
					if( err ) { _logger.error( err ); }
					conn.release();
					_logger.debug( 'query done! returned ' + rows.length + ' rows' );
					exports.cacheControl[_filename].fetching = false;
					exports.writeCacheFile();
					deferred.resolve( rows );
				} );
				return deferred.promise.then( function( rows ) {
					def.resolve( rows );
				} )
			} )
		return def.promise;
	}
}



