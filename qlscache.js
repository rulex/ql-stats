
var fs = require( 'fs' )
var log4js = require( 'log4js' );
var qlsmysql = require( 'mysql' );
var Q = require( 'q' );
var program = require( 'commander' );
var url = require( 'url' );

program
	.version( '0.0.3' )
	.option( '-c, --config <file>', 'Use a different config file. Default ./cfg.json' )
	.option( '-l, --loglevel <LEVEL>', 'Default is DEBUG. levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL' )
	.parse( process.argv );

exports.init = function( ConfigFile, loglevel ) {
	qls_logger = log4js.getLogger( 'qlscache' );
	qls_logger.setLevel( loglevel || log4js.levels.DEBUG );
	//exports.file = ConfigFile.api.cache.file || './qlscache.json';
	exports.dir = program.config || ConfigFile.api.cache.dir || './cachedir/';
	exports.time = ConfigFile.api.cache.time || 60*60*1000;
	exports.dbQueue = [];
	exports.handleDbConn( ConfigFile );
	qls_logger.debug( 'Cache init dir:' + exports.dir + ' time:' + exports.time );
}

exports.handleDbConn = function( ConfigFile ) {
	exports.dbconn = qlsmysql.createConnection( ConfigFile.mysql_db ); // Recreate the dbconn, since
	// the old one cannot be reused.
	exports.dbconn.connect( function( err ) {              // The server is either down
		if( err ) {                                     // or restarting (takes a while sometimes).
			qls_logger.error( 'error when connecting to db:', err );
			setTimeout( handleDisconnect, 2000 ); // We introduce a delay before attempting to reconnect,
		}                                     // to avoid a hot loop, and to allow our node script to
	} );                                     // process asynchronous requests in the meantime.
	// If you're also serving http, display a 503 error.
	exports.dbconn.on( 'error', function( err ) {
		qls_logger.error( 'db error', err );
		if( err.code === 'PROTOCOL_CONNECTION_LOST' ) { // Connection to the MySQL server is usually
			handleDisconnect();                         // lost due to either server restart, or a
		}
		else {                                      // connnection idle timeout (the wait_timeout
			throw err;                                  // server variable configures this)
		}
	});
}

exports.checkRoute = function( apiRoute ) {
	var _filename = apiRoute.replace( /\//g, '' );
	qls_logger.debug( 'check cache ' + _filename );
	// if file exists
	if( fs.existsSync( exports.dir + _filename ) ) {
		if( fs.statSync( exports.dir + _filename ).isFile() ) {
			_now = new Date();
			qls_logger.debug( _filename + ' is a file!' );
			stat = fs.statSync( exports.dir + _filename );
			qls_logger.debug( _filename + ' atime: ' + stat.atime + ' ' + exports.timediff( _now.getTime() - stat.atime.getTime() ) );
			qls_logger.debug( _filename + ' ctime: ' + stat.ctime + ' ' + exports.timediff( _now.getTime() - stat.ctime.getTime() ) );
			qls_logger.debug( _filename + ' mtime: ' + stat.mtime + ' ' + exports.timediff( _now.getTime() - stat.mtime.getTime() ) );
			return { size: stat.size, atime: stat.atime, ctime: stat.ctime, mtime: stat.mtime };
		}
		else {
			qls_logger.debug( _filename + ' is a folder!' );
			return false;
		}
	}
	else {
		qls_logger.debug( _filename + ' is missing!' );
		return false;
	}
}

exports.readCache = function( apiRoute, queryObject, options ) {
	_start = new Date().getTime();
	var _filename = apiRoute.replace( /\//g, '' );
	qls_logger.debug( 'read cache ', _filename );
	_content = JSON.parse( fs.readFileSync( exports.dir + _filename ) );
	qls_logger.debug( 'cache length: ', _content.length );
	// paginate cached file
	if( 'page' in queryObject ) {
		// defaults
		_searchColumns = options.searchColumns || [];
		_page = queryObject.page || 1;
		_perPage = queryObject.perPage || 10;
		_offset = queryObject.offset || 0;
		_queriesSearch = false;
		_queriesSearchString = false;
		_sortColumn = '';
		_sort = 1;
		// regex
		_sortRegex = /^sorts\[(\w+)\]$/;
		_queriesRegex = /^queries\[(\w+)\]$/;
		// loop through queryObject
		for( var i in queryObject ) {
			if( _sortRegex.test( i ) ) {
				_sortColumn = i.replace( _sortRegex, '$1' );
				_sort = queryObject[i];
			}
			if( _queriesRegex.test( i ) ) {
				_queriesSearch = i.replace( _queriesRegex, '$1' );
				_queriesSearchString = queryObject[i];
			}
		}
		// sort
		if( _sort > 0 ) {
			_content.sort( function( a, b ) {
				return a[_sortColumn] - b[_sortColumn];
			} );
		}
		else {
			_content.sort( function( b, a ) {
				return a[_sortColumn] - b[_sortColumn];
			} );
		}
		var dt = { records: [] };
		for( var i in _content ) {
			if( _searchColumns.length > 0 ) {
				for( var j in _searchColumns ) {
					s = _searchColumns[j];
					n = _content[i][s];
					if( _queriesSearch && ! new RegExp( _queriesSearchString, "i" ).test( n ) ) {
					}
					else {
						dt.records.push( _content[i] );
					}
				}
			}
		}
		var _finalArray = [];
		dt.totalRecordCount = _content.length;
		dt.queryRecordCount = dt.records.length;
		for( i = 0; i < _offset; i++ ) {
			dt.records.shift();
		}
		for( var i in dt.records ) {
			if( i == _perPage ) { break; }
			_finalArray.push( dt.records[i] );
		}
		// http://www.dynatable.com/#configuration
		delete dt.records;
		dt.data = _finalArray;
		dt.ms = new Date().getTime() - _start;
		qls_logger.debug( 'sorted in', dt.ms, 'ms' );
		qls_logger.info( apiRoute, 'fetched in', ( new Date().getTime() - _start ), 'ms' );
		return dt;
	}
	else {
		qls_logger.info( apiRoute, 'fetched in', ( new Date().getTime() - _start ), 'ms' );
		return { data: _content };
	}
}

exports.writeCache = function( apiRoute, content ) {
	var _filename = apiRoute.replace( /\//g, '' );
	fs.writeFileSync( exports.dir + _filename, JSON.stringify( content ) );
	qls_logger.debug( 'wrote: ' + _filename );
}

exports.query = function( sql, params, apiRoute ) {
	var _filename = apiRoute.replace( /\//g, '' );
	qls_logger.debug( _filename + ' query!' );
	_start = new Date().getTime();
	qls_logger.debug( sql );
	qls_logger.debug( params );
	exports.dbconn.query( sql, params, function( err, rows ) {
		if( err ) { qls_logger.error( err ); }
		_end = new Date().getTime();
		qls_logger.info( _filename,  'updated', rows.length, 'rows in', ( _end - _start ) + 'ms' );
		exports.writeCache( apiRoute, rows );
	} );
}

exports.doCache = function( req, sql, sqlParams, options ) {
	__start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	var apiRoute = req.url.split( '?' )[0];
	var _filename = apiRoute.replace( /\//g, '' );
	_time = options.time || ( 60*1000 );
	_now = new Date().getTime();
	// checkRoute
	chk = exports.checkRoute( apiRoute );
	if( chk ) {
		if( ( _now - chk.ctime ) > _time ) {
			qls_logger.debug( _filename + ' is ' + ( (_now-chk.ctime)/1000 ) + 's old' );
			// readCache
			_data = exports.readCache( apiRoute, queryObject, options );
			// query
			exports.query( sql, sqlParams, apiRoute );
			_data.updated = chk.ctime.getTime();
			_data.updated_nice = chk.ctime;
			return _data;
		}
		else {
			// readCache
			_data = exports.readCache( apiRoute, queryObject, options );
			qls_logger.debug( _filename + ' is fresh' );
			_data.updated = chk.ctime.getTime();
			_data.updated_nice = chk.ctime;
			return _data;
		}
	}
	else {
		exports.query( sql, sqlParams, apiRoute );
		return { msg: 'Fetching...', data: [] };
	}
}

exports.timediff = function( d1, d2 ) {
	var ms;
	if( d2 ) {
		d1 = new Date( d1 );
		d2 = new Date( d2 );
		ms = d1 - d2;
		if( ms < 0 ) { ms = Math.abs( ms ); }
	}
	else {
		ms = d1;
	}
	var _y = parseInt( ms / 1000 / 60 / 60 / 24 / 365 );
	ms = ms - ( _y * 1000 * 60 * 60 * 24 * 365 );
	var _M = parseInt( ms / 1000 / 60 / 60 / 24 / 30 );
	ms = ms - ( _M * 1000 * 60 * 60 * 24 * 30 );
	var _w = parseInt( ms / 1000 / 60 / 60 / 24 / 7 );
	ms = ms - ( _w * 1000 * 60 * 60 * 24 * 7 );
	var _d = parseInt( ms / 1000 / 60 / 60 / 24 );
	ms = ms - ( _d * 1000 * 60 * 60 * 24 );
	var _h = parseInt( ms / 1000 / 60 / 60 );
	ms = ms - ( _h * 1000 * 60 * 60 );
	var _m = parseInt( ms / 1000 / 60 );
	ms = ms - ( _m * 1000 * 60 );
	var _s = parseInt( ms / 1000 );
	var y = _y >= 1 ? _y + "y " : "";
	var M = _M >= 1 ? _M + "M " : "";
	var w = _w >= 1 ? _w + "w " : "";
	var d = _d >= 1 ? _d + "d " : "";
	var h = _h >= 1 ? _h + "h " : "";
	var m = _m >= 1 ? _m + "m " : "";
	var s = _s >= 1 ? _s + "s " : "";
	//return d + h + m + s + "";
	return y + M + w + d + h + m + s + "";
	//return _d + "d " + _h + "h " + _m + "m " + _s + "s " + "ago";
}



