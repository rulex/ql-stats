
angular.module( 'liz', ['lizzy'] )
.config( ['$routeProvider', function( $routeProvider ) {
	$routeProvider.
	when( '/', { controller: OverviewCtrl, templateUrl: 'overview.html' } ).
	when( '/overview', { controller: OverviewCtrl, templateUrl: 'overview.html' } ).
	when( '/games', { controller: GamesCtrl, templateUrl: 'games.html' } ).
	when( '/game/:game', { controller: GameCtrl, templateUrl: 'game.html' } ).
	when( '/players', { controller: PlayersCtrl, templateUrl: 'players.html' } ).
	when( '/player/:player', { controller: PlayerCtrl, templateUrl: 'player.html' } ).
	when( '/owners', { controller: OwnersCtrl, templateUrl: 'owners.html' } ).
	when( '/owner/:owner', { controller: OwnerCtrl, templateUrl: 'owner.html' } ).
	when( '/clans', { controller: ClansCtrl, templateUrl: 'clans.html' } ).
	when( '/clan/:clan', { controller: ClanCtrl, templateUrl: 'clan.html' } ).
	otherwise( { redirectTo: '/' } );
} ] );


function OverviewCtrl( $scope, theLiz, $timeout ) {
	var lol = theLiz.overview();
	$scope.overview = lol;
	$scope.date = new Date().getTime();
}
function GamesCtrl( $scope, theLiz, $timeout ) {
	var lol = theLiz.games();
	$scope.games = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function GameCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var g = $routeParams.game;
	var lol = theLiz.game( g );
	$scope.game = lol;
	$scope.ordercolumn = 'RANK';
	$scope.ordertype = false;
	$scope.date = new Date().getTime();
}
function PlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var p = $routeParams.player;
	var lol = theLiz.player( p );
	$scope.player = lol;
	var lol2 = theLiz.playergames( p );
	$scope.games = lol2;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function PlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var lol = theLiz.players();
	$scope.players = lol;
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
}
function OwnersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var lol = theLiz.owners();
	$scope.owners = lol;
	$scope.date = new Date().getTime();
}
function OwnerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var o = $routeParams.owner;
	var lol = theLiz.owner( o );
	$scope.owner = lol;
	$scope.ordercolumn = 'MATCHES_PLAYED';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function ClansCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var lol = theLiz.clans();
	$scope.clans = lol;
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'MATCHES_PLAYED';
	$scope.ordertype = true;
	//$scope.currentPage = 0;
	//$scope.pageSize = 20;
	//$scope.numberOfPages = function() {
	//	return Math.ceil( $scope.clans.length/$scope.pageSize );
	//};
}
function ClanCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var c = $routeParams.clan;
	var lol = theLiz.clan( c );
	$scope.clan = lol;
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'MATCHES_PLAYED';
	$scope.ordertype = true;
	$scope.urlc = function( url ) {
		url = encodeURI( url );
		return url;
	}
}


angular.module( 'lizzy', ['ngResource'] ).
factory( 'theLiz', function( $http ) {
	var theLiz = function( data ) {
		angular.extend( this, data );
	}
	theLiz.overview = function() {
		return $http.get( 'stats/all' ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.games = function() {
		return $http.get( 'stats/games' ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.game = function( g ) {
		return $http.get( 'stats/game/' + g ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.player = function( p ) {
		return $http.get( 'stats/player/' + p ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.playergames = function( p ) {
		return $http.get( 'stats/player/' + p + '/games' ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.players = function() {
		return $http.get( 'stats/players' ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.owners = function() {
		return $http.get( 'stats/owners' ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.owner = function( o ) {
		return $http.get( 'stats/owner/' + o ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.clans = function() {
		return $http.get( 'stats/clans' ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	theLiz.clan = function( c ) {
		return $http.get( 'stats/clan/' + c ).then( function( response ) {
			return new theLiz( response.data );
		} );
	}
	return theLiz;
} )
.filter( 'kbytes', function() {
	return function( bytes, precision ) {
		if( isNaN( parseFloat( bytes ) ) || !isFinite( bytes ) ) return '-';
		if( typeof precision === 'undefined' ) precision = 1;
		var units = [ 'kB', 'MB', 'GB', 'TB', 'PB' ];
		var number = Math.floor( Math.log( bytes) / Math.log( 1024 ) );
		return ( bytes / Math.pow( 1024, Math.floor( number ) ) ).toFixed( precision ) +  ' ' + units[number];
	}
} )
.filter( 'timeago', function() {
	return function( d1, d2 ) {
		d1 = new Date( d1 );
		//d1 = new Date( '2013-03-28T11:00:00' );
		d2 = new Date(  );
		var ms = d2 - d1;
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
} )
.filter( 'daysago', function() {
	return function( d1, d2 ) {
		d1 = new Date( d1 );
		d2 = new Date(  );
		var ms = d2 - d1;
		return ms / 1000 / 60 / 60 / 24 ;
	}
} )
.filter( 'shortenPID', function() {
	return function( pid ) {
		return pid.split( '-' )[0];
	}
} )
.filter( 'startForm', function() {
	return function( input, start ) {
		start = +start;
		return input.slice( start );
	}
} )
.filter( 'escape', function() {
	return function( m ) {
		return escape( m );
	}
} );

function daysago( d1, d2 ) {
	d1 = new Date( d1 );
	//d1 = new Date( '2013-03-28T11:00:00' );
	d2 = new Date(  );
	var ms = d2 - d1;
	var _d = parseInt( ms / 1000 / 60 / 60 / 24 );
	var d = _d > 1 ? _d + "d " : "";
	return d;
	//return _d + "d " + _h + "h " + _m + "m " + _s + "s " + "ago";
}




