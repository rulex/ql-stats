
var fs = require( 'fs' )
var log4js = require( 'log4js' );
var qlsmysql = require( 'mysql' );
var Q = require( 'q' );
var program = require( 'commander' );
var url = require( 'url' );
var touch = require( 'touch' );

program
	.version( '0.0.3' )
	.option( '-c, --config <file>', 'Use a different config file. Default ./cfg.json' )
	.option( '-L, --loglevel <LEVEL>', 'Default is DEBUG. levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL' )
	.option( '-i, --init', 'init qls cache' )
	.option( '-l, --list', 'List cached routes' )
	.option( '-q, --queue', 'List queued cached routes' )
	.parse( process.argv );

exports.qls_logger = log4js.getLogger( 'qlscache' );

exports.init = function( ConfigFile, loglevel ) {
	exports.qls_logger.setLevel( loglevel || log4js.levels.DEBUG );
	exports.dir = program.config || './cachedir/';
	exports.dbQueue = [];
	//exports.handleDbConn( ConfigFile );
	exports.dbpool = qlsmysql.createPool( ConfigFile.mysql_db );
	exports.qls_logger.debug( 'Cache init dir:' + exports.dir + ' time:' + exports.time );
}

exports.handleDbConn = function( ConfigFile ) {
	exports.dbconn = qlsmysql.createConnection( ConfigFile.mysql_db ); // Recreate the dbconn, since
	// the old one cannot be reused.
	exports.dbconn.connect( function( err ) {              // The server is either down
		if( err ) {                                     // or restarting (takes a while sometimes).
			exports.qls_logger.error( 'error when connecting to db:', err );
			setTimeout( handleDisconnect, 2000 ); // We introduce a delay before attempting to reconnect,
		}                                     // to avoid a hot loop, and to allow our node script to
	} );                                     // process asynchronous requests in the meantime.
	// If you're also serving http, display a 503 error.
	exports.dbconn.on( 'error', function( err ) {
		exports.qls_logger.error( 'db error', err );
		if( err.code === 'PROTOCOL_CONNECTION_LOST' ) { // Connection to the MySQL server is usually
			handleDisconnect();                         // lost due to either server restart, or a
		}
		else {                                      // connnection idle timeout (the wait_timeout
			throw err;                                  // server variable configures this)
		}
	});
}

exports.checkRoute = function( apiRoute, queryObject, options ) {
	var _filename = exports.mkFilename( apiRoute );
	var isQueued = false;
	var queueStats;
	_time = options.time || 15 * 60*1000;
	exports.qls_logger.debug( 'check cache ' + _filename );
	// if queue file exists
	if( fs.existsSync( exports.dir + _filename + '.queue' ) ) {
		queueStats = exports.checkQueue( apiRoute );
		exports.qls_logger.debug( apiRoute, 'is queued' );
		isQueued = true;
	}
	// if cache file exists
	if( fs.existsSync( exports.dir + _filename ) ) {
		if( fs.statSync( exports.dir + _filename ).isFile() ) {
			_now = new Date();
			// get file stat
			stat = fs.statSync( exports.dir + _filename );
			exports.qls_logger.debug( apiRoute, 'ctime:', stat.ctime, exports.timediff( _now.getTime() - stat.ctime.getTime() ) );
			// if cache is old
			if( ( _now - stat.ctime ) > _time ) {
				exports.qls_logger.debug( apiRoute + ' is ' + ( (_now-stat.ctime)/1000 ) + 's old' );
				// readCache
				_data = exports.readCache( apiRoute, queryObject, options );
				_data.updated = stat.ctime.getTime();
				_data.updated_nice = stat.ctime;
				_data.route = apiRoute;
				// add to queue if its not
				if( ! isQueued ) {
					exports.addQueue( apiRoute, options );
				}
				if( queueStats ) {
					_data.queued = queueStats.queued;
					_data.queued_nice = queueStats.queued_nice;
				}
				//
				return _data;
			}
			// if cache is fresh
			else {
				// readCache
				_data = exports.readCache( apiRoute, queryObject, options );
				exports.qls_logger.debug( apiRoute + ' is fresh' );
				_data.updated = stat.ctime.getTime();
				_data.updated_nice = stat.ctime;
				_data.route = apiRoute;
				return _data;
			}
		}
		else {
			exports.qls_logger.error( _filename + ' is a folder!' );
			return { msg: 'Dat error! =)', data: [] };
		}
	}
	else {
		_data = { msg: 'The requested data is not available at the moment but is being fetched...', data: [] };
		if( ! isQueued ) {
			exports.addQueue( apiRoute, options );
		}
		if( queueStats ) {
			_data.queued = queueStats.queued;
			_data.queued_nice = queueStats.queued_nice;
		}
		exports.qls_logger.debug( _filename + ' is missing!' );
		// add to queue
		//
		return ;
	}
}

exports.rmQueue = function() {
	_start = new Date().getTime();
	fs.unlink( exports.dir + 'active.queue', function( err ) {
		if( err ) { exports.qls_logger.error( err ) };
	} );
	// unset queue file lock
}

exports.addQueue = function( apiRoute, options ) {
	_start = new Date().getTime();
	var _filename = exports.mkFilename( apiRoute ) + '.queue';
	fs.writeFileSync( exports.dir + _filename, JSON.stringify( options ) );
	exports.qls_logger.debug( _filename, 'added to queue', ( new Date().getTime() - _start ), 'ms' );
}

exports.nextQueue = function() {
	exports.qls_logger.debug( 'nextQueue()' );
	// check if a query is currently active
	if( fs.existsSync( exports.dir + 'active.queue' ) ) {
		if( fs.statSync( exports.dir + 'active.queue' ).isFile() ) {
			// do nothing
			return null;
		}
	}
	queue = exports.listQueue();
	if( queue.length > 0 ) {
		_route = queue[0];
		// read queue file
		_content = JSON.parse( fs.readFileSync( exports.dir + _route.cache + '.queue' ) );
		// set a queue file lock
		fs.renameSync( exports.dir + _route.cache + '.queue', exports.dir + 'active.queue' );
		//
		exports.qls_logger.debug( _content );
		// query
		exports.qls_logger.info( 'Doing', _route.cache, '(', queue.length-1, 'in queue )' );
		exports.query( _content.sql, _content.sqlParams, _route.cache );
	}
	else {
		exports.qls_logger.info( 'queue is empty' );
	}
}

exports.checkQueue = function( apiRoute ) {
	var _filename = exports.mkFilename( apiRoute ) + '.queue';
	exports.qls_logger.debug( 'checkQueue()', _filename );
	// if file exists
	if( fs.existsSync( exports.dir + _filename ) ) {
		if( fs.statSync( exports.dir + _filename ).isFile() ) {
			_now = new Date();
			exports.qls_logger.debug( _filename + ' is a file!' );
			stat = fs.statSync( exports.dir + _filename );
			exports.qls_logger.debug( _filename, 'ctime:', stat.ctime, exports.timediff( _now.getTime() - stat.ctime.getTime() ) );
			return { queued_nice: stat.ctime, queued: stat.ctime.getTime() };
		}
		else {
			exports.qls_logger.debug( _filename + ' is a folder!' );
			return false;
		}
	}
	else {
		exports.qls_logger.debug( _filename + ' is missing!' );
		return false;
	}
}

exports.listQueue = function() {
	exports.qls_logger.debug( 'listQueue()' );
	files = fs.readdirSync( exports.dir );
	out = [];
	for( var i in files ) {
		if( /\.queue$/.test( files[i] ) ) {
			out.push( { cache: files[i].replace( '.queue', '' ) } );
		}
	}
	for( var i in out ) {
		f = out[i];
		_stat = fs.statSync( exports.dir + f.cache + '.queue' );
		f.queued = ( _start - _stat.ctime.getTime() );
		f.queued_nice = exports.timediff( new Date().getTime() - _stat.ctime.getTime() );
	}
	out.sort( function( a, b ) {
		return a.time - b.time;
	} );
	return out;
}

exports.listCaches = function( options ) {
	_start = new Date().getTime();
	exports.qls_logger.debug( 'listCaches' );
	files = fs.readdirSync( exports.dir );
	out = [];
	for( var i in files ) {
		if( /^Api/.test( files[i] ) && ! /^Api.*\.queue$/.test( files[i] ) ) {
			out.push( { cache: files[i] } );
		}
	}
	totalSize = 0;
	for( var i in out ) {
		f = out[i];
		_stat = fs.statSync( exports.dir + f.cache );
		f.time = ( _start - _stat.ctime.getTime() );
		f.size = _stat.size;
		totalSize += _stat.size;
		f.time_nice = exports.timediff( new Date().getTime() - _stat.ctime.getTime() );
		f.size_nice = exports.size( _stat.size );
	}
	exports.qls_logger.debug( 'total', exports.size( totalSize ), 'length', out.length );
	return out;
}

exports.readCache = function( apiRoute, queryObject, options ) {
	_start = new Date().getTime();
	var _filename = exports.mkFilename( apiRoute );
	exports.qls_logger.debug( 'read cache ', _filename );
	_content = JSON.parse( fs.readFileSync( exports.dir + _filename ) );
	exports.qls_logger.debug( 'cache length: ', _content.length );
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
		exports.qls_logger.debug( 'sorted in', dt.ms, 'ms' );
		exports.qls_logger.info( apiRoute, 'fetched & sorted in', ( new Date().getTime() - _start ), 'ms' );
		return dt;
	}
	else {
		exports.qls_logger.info( apiRoute, 'fetched in', ( new Date().getTime() - _start ), 'ms' );
		return { data: _content };
	}
}

exports.writeCache = function( _filename, content ) {
	exports.qls_logger.debug( 'writeCache()' );
	fs.writeFileSync( exports.dir + _filename, JSON.stringify( content ) );
	exports.qls_logger.debug( 'wrote: ' + _filename );
}

exports.query = function( sql, sqlParams, _filename ) {
	exports.qls_logger.debug( _filename + ' query!' );
	_start = new Date().getTime();
	exports.qls_logger.debug( sql );
	exports.qls_logger.debug( sqlParams );
	//
	exports.dbpool.getConnection( function( err, conn ) {
		if( err ) { exports.qls_logger.error( err ); }
		conn.query( sql, sqlParams, function( err, rows ) {
			conn.release();
			if( err ) { exports.qls_logger.error( err ); }
			_end = new Date().getTime();
			exports.qls_logger.info( _filename,  'updated', rows.length, 'rows in', ( _end - _start ), 'ms' );
			if( rows.length > 0 ) {
				// write new cache file
				exports.writeCache( _filename, rows );
			}
			// remove from queue
			exports.rmQueue();
			// continue with queue after a delay
			setTimeout( function() {
				exports.nextQueue();
			}, 1000 );
		} );
	} );
}

exports.doCache = function( req, sql, sqlParams, options ) {
	options.sql = sql;
	options.sqlParams = sqlParams;
	__start = new Date().getTime();
	var queryObject = url.parse( req.url, true ).query;
	var apiRoute = req.url.split( '?' )[0];
	var _filename = exports.mkFilename( apiRoute );
	_time = options.time || ( 15 * 60*1000 );
	_now = new Date().getTime();
	// checkRoute
	returnData = exports.checkRoute( apiRoute, queryObject, options );
	// check queue
	queue = exports.listQueue();
	if( queue.length > 0 ) {
		exports.qls_logger.debug( 'queue.length', queue.length );
		exports.qls_logger.debug( queue );
	}
	exports.nextQueue();
	return returnData;
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

exports.size = function( bytes, precision ) {
	if( isNaN( parseFloat( bytes ) ) || !isFinite( bytes ) ) return '-';
	if( typeof precision === 'undefined' ) precision = 2;
	var units = [ 'b', 'kB', 'MB', 'GB', 'TB', 'PB' ];
	var number = Math.floor( Math.log( bytes) / Math.log( 1024 ) );
	return ( bytes / Math.pow( 1024, Math.floor( number ) ) ).toFixed( precision ) +  '' + units[number];
}

exports.mkFilename = function( apiRoute ) {
	var spl = apiRoute.split( '/' );
	out = '';
	for( var i in spl ) {
		out += spl[i].charAt( 0 ).toUpperCase() + spl[i].slice( 1 );
	}
	return out;
}

if( program.init ) {
	_start = new Date().getTime();
	// read cfg.json
	var data = fs.readFileSync( program.config || __dirname + '/cfg.json' );
	var cfg;
	try {
		cfg = JSON.parse( data );
		exports.qls_logger.info( 'Parsed config file' );
	}
	catch( err ) {
		exports.qls_logger.error( 'failed to parse cfg: ' + err );
		process.exit();
	}
	loglvl = program.loglevel;
	var qls = exports.init( cfg, loglvl );
	if( program.list ) {
		_caches = exports.listCaches();
		exports.qls_logger.info( _caches );
		exports.qls_logger.info( 'count', _caches.length );
	}
	if( program.queue ) {
		_caches = exports.listQueue();
		exports.qls_logger.info( _caches );
		exports.qls_logger.info( 'count', _caches.length );
	}
	exports.qls_logger.debug( 'exiting after', ( new Date().getTime() - _start ), 'ms' );
	process.exit();
}



