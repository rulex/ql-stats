
var apiurl = '/';
//var apiurl = 'http://ql.leeto.fi/';
//var apiurl = 'http://ql.l.leeto.fi/';

var dynatable_writers = {
	COUNTRY: function( obj ) {
		return '<img src="http://cdn.quakelive.com/web/2013071601/images/flags/'+ obj.COUNTRY.toLowerCase() +'_v2013071601.0.gif" class="playerflag" />';
	},
	CLAN: function( obj ) {
		return '<a href="#/clans/'+ obj.CLAN_ID +'">' + obj.CLAN + '</a>';
	},
	MAP: function( obj ) {
		return '<a href="#/maps/'+ obj.MAP +'">' + obj.MAP + '</a>';
	},
	OWNER: function( obj ) {
		return '<a href="#/owners/'+ obj.OWNER +'">' + obj.OWNER + '</a>';
	},
	PUBLIC_ID: function( obj ) {
		return '<a href="#/games/'+ obj.PUBLIC_ID +'">' + shortenPID( obj.PUBLIC_ID ) + '</a>';
	},
	PLAYER_NICK: function( obj ) {
		return '<a href="#/players/'+ obj.PLAYER_NICK +'">' + obj.PLAYER_NICK + '</a>';
	},
	GAME_TIMESTAMP: function( obj ) {
		return obj.GAME_TIMESTAMP + ' ' + timediff( ( obj.GAME_TIMESTAMP *1000 )+60*60*6*1000, new Date().getTime() ) + ' ago';
		//return convertTimestamp( obj.GAME_TIMESTAMP );
	},
	GAME_LENGTH: function( obj ) {
		return timediff( obj.GAME_LENGTH * 1000 );
	},
	GAME_TYPE: function( obj ) {
		/*
		var gt = '';
		if( obj.GAME_TYPE == 'harv' ) {
			gt = 'harvester';
		}
		else {
			gt = obj.GAME_TYPE;
		}
		*/
		return '<a href="#/gametypes/' + obj.GAME_TYPE + '">' + obj.GAME_TYPE + '</a>';
	},
	GAME_LENGTH_SUM: function( obj ) {
		return timediff( obj.GAME_LENGTH_SUM * 1000 );
	},
	GAME_LENGTH_AVG: function( obj ) {
		return timediff( obj.GAME_LENGTH_AVG * 1000 );
	},
};
var dynatable_features = {
	sort: true,
	perPageSelect: true,
	paginate: true,
	search: true,
	recordCount: true,
	pushState: false,
};

$( function() {
	//console.log( getUrl() );
} );

angular.module( 'liz', ['lizzy'] )
.config( [ '$routeProvider', function( $routeProvider ) {
	$routeProvider.
	when( '/', { controller: OverviewCtrl, templateUrl: 'overview.html' } ).
	//when( '/', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	//when( '/all', { controller: AllCtrl, templateUrl: 'all.html' } ).
	when( '/overview', { controller: OverviewCtrl, templateUrl: 'overview.html' } ).
	when( '/games', { controller: GamesCtrl, templateUrl: 'games2.html' } ).
	when( '/games/:game', { controller: GameCtrl, templateUrl: 'game.html' } ).
	when( '/players', { controller: PlayersCtrl, templateUrl: 'players.html' } ).
	when( '/players/:player', { controller: PlayerCtrl, templateUrl: 'player.html' } ).
	when( '/owners', { controller: OwnersCtrl, templateUrl: 'owners.html' } ).
	when( '/owners/:owner', { controller: OwnerCtrl, templateUrl: 'owner.html' } ).
	when( '/owners/:owner/players', { controller: OwnerPlayersCtrl, templateUrl: 'players.html' } ).
	when( '/owners/:owner/games', { controller: OwnerGamesCtrl, templateUrl: 'games2.html' } ).
	when( '/owners/:owner/players/:player', { controller: OwnerPlayerCtrl, templateUrl: 'player.html' } ).
	when( '/owners/:owner/top/last30days', { controller: OwnerTopCtrl, templateUrl: 'top.html' } ).
	when( '/clans', { controller: ClansCtrl, templateUrl: 'clans.html' } ).
	//when( '/clans', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/clans/:clan', { controller: ClanCtrl, templateUrl: 'clan.html' } ).
	//when( '/clan/:clan', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/maps', { controller: MapsCtrl, templateUrl: 'maps.html' } ).
	//when( '/maps', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/maps/:map', { controller: MapCtrl, templateUrl: 'map.html' } ).
	//when( '/map/:map', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	when( '/countries', { controller: CountriesCtrl, templateUrl: 'countries.html' } ).
	when( '/countries/:country', { controller: EmptyCtrl, templateUrl: 'maintenance.html' } ).
	//when( '/eloduel', { controller: EloDuelCtrl, templateUrl: 'elo_duel.html' } ).
	when( '/gametypes/:gametype', { controller: GametypeCtrl, templateUrl: 'gametype.html' } ).
	when( '/tags/:tag', { controller: TagCtrl, templateUrl: 'tag.html' } ).
	when( '/tags/:tag/games', { controller: TagGamesCtrl, templateUrl: 'games.html' } ).
	when( '/tags/:tag/players', { controller: TagPlayersCtrl, templateUrl: 'players.html' } ).
	when( '/tags/:tag/players/:player', { controller: TagPlayerCtrl, templateUrl: 'player.html' } ).
	when( '/tags', { controller: TagsCtrl, templateUrl: 'tags.html' } ).
	when('/race', { controller: RaceCtrl, templateUrl: 'race.html' }).
	when('/race/maps/:map', { controller: RaceMapCtrl, templateUrl: 'racemap.html' }).
	when('/race/players/:player', { controller: RacePlayerCtrl, templateUrl: 'raceplayer.html' }).
	otherwise({ redirectTo: '/' });
}]);

function EmptyCtrl( $scope, $timeout, $routeParams ) {
}
function OverviewCtrl( $scope, theLiz, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var lol = theLiz.overview();
	$scope.overview = lol;
	$scope.ordercolumn = 'TOTAL_KILLS';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
	$scope.sum = function( list, field ) {
		var total = 0;
		angular.forEach( list, function( item ) {
			total += item[field];
		} );
		return total;
	}
}
function AllCtrl( $scope, theLiz, $timeout, $routeParams ) {
	var lol = theLiz.all();
	$scope.overview = lol;
	$scope.date = new Date().getTime();
	//$scope.maps = theLiz.overview_maps();
	$.ajax( {
		url: "api/all/daily",
		type: "get",
		dataType: "json"
	} ).success( function( data ) {
		console.log( data );
		var thedata = polyjs.data( data.thedays );
		polyjs.chart( {
			title: "Saved matches / day",
			dom: "daily_matches",
			width: 500,
			height: 300,
			layers: [
				{
					data: thedata,
					type: 'line',
					x: 'date',
					y: 'count',
					color: { const: 'green' },
				},
				/*
				{
					data: thedata,
					type: 'point',
					x: 'date',
					y: 'count',
					opacity: { const: 0.5 },
					color: { const: 'green' },
				},
				*/
			],
			guide: {
				y: {
					min: 0,
					max: 15000
				},
				color: { numticks: 10 },
			}
		} );
	} );
}
function GamesCtrl( $scope, theLiz, $timeout ) {
	console.log( parseUrl() );
	console.log( parseHash() );
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/games',
		success: function( data ) {
			//console.log( data );
			$( '#table_games_' ).hide();
			$( '#table_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
			//console.log( data );
		},
	} );
	/*
	var lol = theLiz.games();
	$scope.games = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
	*/
}
function GameCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var g = $routeParams.game;
	var lol = theLiz.game( g );
	$scope.game = lol;
	$scope.ordercolumn = 'RANK';
	$scope.ordertype = false;
	$scope.date = new Date().getTime();
}
function PlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var p = $routeParams.player;
	var lol = theLiz.player( p );
	$scope.player = lol;
	$scope.date = new Date().getTime();
	$.ajax( {
		url: apiurl + 'api/players/' + p + '/games',
		success: function( data ) {
			//console.log( data );
			$( '#table_player_games_' ).hide();
			$( '#table_player_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data.games.sort( function ( a, b ) { return b.GAME_TIMESTAMP-a.GAME_TIMESTAMP } )
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
			//console.log( data );
		},
	} );
	$scope.$on( 'Update', function( e ) {
		console.log( e );
		console.log( p );
		//$( '#player_update_btn' ).attr( 'disabled', 'disabled' );
	  //console.log( $scope.player.$$v.data.player.PLAYER_NICK ); // NICE!
		$scope.player_updated = theLiz.player_update( p );
	} );
}
function PlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	//$scope.page = parseInt( $routeParams.page );
	$scope.theurl = '';
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'KILLS';
	$scope.ordertype = true;
	$scope.$on( 'Search', function() {
		$scope.players = theLiz.players_search( $( '#players_search' ).val() );
	} );
	$scope.showsearch = true;
}
function OwnersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/owners',
		success: function( data ) {
			//console.log( data );
			$( '#table_owners_' ).hide();
			$( '#table_owners' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
			//console.log( data );
		},
	} );
}
function OwnerTopCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	$.ajax( {
		url: apiurl + 'api/owners/' + o + '/top/last30days/kills',
		success: function( data ) {
			//console.log( data );
			$( '#table_top_kills_' ).hide();
			$( '#table_top_kills' ).dynatable( {
				features: {
					sort: true,
					perPageSelect: false,
					paginate: true,
					search: false,
					recordCount: false,
					pushState: false,
				},
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 10,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
			//console.log( data );
		},
	} );
}
function OwnerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	var lol = theLiz.owner( o );
	$scope.owner = lol;
	$scope.ordercolumn = 'MATCHES_PLAYED';
	$scope.ordertype = true;
	$scope.ordercolumn2 = 'PLAY_TIME';
	$scope.ordertype2 = true;
	$scope.ordercolumn3 = 'GAME_TIMESTAMP';
	$scope.ordertype3 = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function OwnerPlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	var p = $routeParams.player;
	var lol = theLiz.ownerplayer( o, p );
	$scope.player = lol;
	$scope.games = theLiz.ownerplayergames( o, p );
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function OwnerPlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	if( $routeParams.owner ) {
		$scope.theurl = 'owner/' + $routeParams.owner + '/';
	}
	var o = $routeParams.owner;
	var lol = theLiz.owner_players( o );
	$scope.players = lol;
	$scope.ordercolumn = 'KILLS';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function OwnerGamesCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var o = $routeParams.owner;
	$.ajax( {
		url: apiurl + 'api/owners/' + o + '/games',
		success: function( data ) {
			//console.log( data );
			$( '#table_games_' ).hide();
			$( '#table_games' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 20,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
			//console.log( data );
		},
	} );
	/*
	if( $routeParams.owner ) {
		$scope.theurl = 'owner/' + $routeParams.owner + '/';
	}
	var o = $routeParams.owner;
	var lol = theLiz.owner_games( o );
	$scope.games = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
	*/
}
function ClansCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	console.log( parseUrl() );
	console.log( parseHash() );
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/clans',
		success: function( data ) {
			$( '#table_clans_' ).hide();
			$( '#table_clans' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 200,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
		},
	} );
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
function MapsCtrl( $scope, theLiz, $timeout ) {
	console.log( parseUrl() );
	console.log( parseHash() );
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/maps',
		success: function( data ) {
			$( '#table_maps_' ).hide();
			$( '#table_maps' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 200,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
		},
	} );
}
function MapCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	console.log( parseUrl() );
	console.log( parseHash() );
	var m = $routeParams.map;
	$( '#current_url' ).html( printLocations() );
	$.ajax( {
		url: apiurl + 'api/maps/' + m,
		success: function( data ) {
			$( '#table_map_' ).hide();
			$( '#table_map' ).dynatable( {
				features: dynatable_features,
				writers: dynatable_writers,
				dataset: {
					perPageDefault: 50,
					perPageOptions: [10,20,50,100,200],
					records: data.data
				}
			} );
		},
		error: function( data ) {
			console.log( data );
		},
		complete: function( data ) {
		},
	} );
}
function GametypeCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var gt = $routeParams.gametype;
	var lol = theLiz.gametype( gt );
	$scope.gametype = lol;
	$scope.date = new Date().getTime();
}
function CountriesCtrl( $scope, theLiz, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var lol = theLiz.countries();
	$scope.countries = lol;
	$scope.ordercolumn = 'NUM_PLAYERS';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function EloDuelCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	var lol = theLiz.eloduel();
	$scope.players = lol;
	$scope.date = new Date().getTime();
	$scope.ordercolumn = 'ELO';
	$scope.ordertype = true;
}
function TagCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	var lol = theLiz.tag( t );
	$scope.tag = lol;
	$scope.date = new Date().getTime();
}
function TagsCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var lol = theLiz.tags();
	$scope.tags = lol;
	$scope.date = new Date().getTime();
}
function TagGamesCtrl( $scope, theLiz, $routeParams, $location, $timeout  ) {
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	var lol = theLiz.taggames( t );
	$scope.games = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function TagPlayersCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	if( $routeParams.tag ) {
		$scope.theurl = 'tags/' + $routeParams.tag + '/';
	}
	var t = $routeParams.tag;
	var lol = theLiz.tagplayers( t );
	$scope.players = lol;
	$scope.ordercolumn = 'GAME_TIMESTAMP';
	$scope.ordertype = true;
	$scope.date = new Date().getTime();
}
function TagPlayerCtrl( $scope, theLiz, $routeParams, $location, $timeout ) {
	$( '#current_url' ).html( printLocations() );
	var t = $routeParams.tag;
	var p = $routeParams.player;
	var lol = theLiz.tagplayer( t, p );
	$scope.player = lol;
	//$scope.games = theLiz.ownerplayergames( t, p );
	//$scope.ordercolumn = 'GAME_TIMESTAMP';
	//$scope.ordertype = true;
	//$scope.theplayers = theLiz.owner_players( o );
	//$scope.thegames = theLiz.owner_games( o );
	$scope.date = new Date().getTime();
}
function RaceCtrl($scope, theLiz, $routeParams, $location, $timeout) {
  $('#current_url').html(printLocations());
  var lol = theLiz.race();
  $scope.racemaps = lol;
  $scope.ordercolumn = 'MAP';
  $scope.ordertype = false;
  $scope.showsearch = true;
}
function RaceMapCtrl($scope, theLiz, $routeParams, $location, $timeout) {
  $('#current_url').html(printLocations());
  var m = $routeParams.map;
  var w = $location.search()["weapons"];
  var r = $location.search()["ruleset"];
  var lol = theLiz.racemap(m, r, w);
  $scope.scores = lol;
  $scope.map = m;
  $scope.ordercolumn = 'RANK';
  $scope.ordertype = false;
}
function RacePlayerCtrl($scope, theLiz, $routeParams, $location, $timeout) {
  $('#current_url').html(printLocations());
  var p = $routeParams.player;
  var w = $location.search()["weapons"];
  var r = $location.search()["ruleset"];
  var lol = theLiz.raceplayer(p, r, w);
  $scope.scores = lol;
  $scope.player = p;
  $scope.ordercolumn = 'MAP';
  $scope.ordertype = false;
}

var _perpage = 20;

function parseUrl() {
	var url_params = location.search.substring(1).split( '&' ), url_p = {};
	for( var i in url_params ) { url_p[url_params[i].split( '=' )[0]] = url_params[i].split( '=' )[1] };
	return url_p;
}
function parseHash() {
	var url_params = location.hash.substring(2).split( '/' );
	return url_params;
}
function printLocations() {
	var out = "";
	var h = parseHash();
	var url = "";
	for( var i in h ) {
		url += '/' + h[i];
		out += '<span class=""> / </span>';
		out += '<a class="btn btn-xs btn-default" href="#'+ url +'">'+ h[i] +'</a> ';
		//out += '<div class="btn btn-xs btn-default"> > </div>';
	}
	return out;
}

angular.module( 'lizzy', ['ngResource'] ).
factory( 'theLiz', function( $http ) {
	var theLiz = function( data ) {
		angular.extend( this, data );
	}
	theLiz.all = function() {
		return $http( { url: apiurl + 'api/all' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.overview = function() {
		return $http( { url: apiurl + 'api/overview' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.overview_maps = function() {
		return $http( { url: apiurl + 'api/all/maps' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.games = function() {
		return $http( { url: apiurl + 'api/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.game = function( g ) {
		return $http( { url: apiurl + 'api/games/' + g + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.player = function( p ) {
		return $http( { url: apiurl + 'api/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.playergames = function( p ) {
		return $http( { url: apiurl + 'api/players/' + p + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.players = function( page ) {
		return $http( { url: apiurl + 'api/players/' + page + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owners = function() {
		return $http( { url: apiurl + 'api/owners' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owner = function( o ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.ownerplayer = function( o, p ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.ownerplayergames = function( o, p ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/players/' + p + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owner_players = function( o ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/players' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.owner_games = function( o ) {
		return $http( { url: apiurl + 'api/owners/' + o + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.clans = function() {
		return $http( { url: apiurl + 'api/clans' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.clan = function( c ) {
		return $http( { url: apiurl + 'api/clans/' + c + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.maps = function() {
		return $http( { url: apiurl + 'api/maps' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.gametype = function( gt ) {
		return $http( { url: apiurl + 'api/gametypes/' + gt + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.countries = function() {
		return $http( { url: apiurl + 'api/countries' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.eloduel = function( m ) {
		return $http( { url: apiurl + 'api/eloduel' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tag = function( t ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tags = function( t ) {
		return $http( { url: apiurl + 'api/tags' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.taggames = function( t ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/games' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tagplayers = function( t ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/players' + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.tagplayer = function( t, p ) {
		return $http( { url: apiurl + 'api/tags/' + t + '/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.players_search = function( p ) {
		return $http( { url: apiurl + 'api/search/players/' + p + '/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.player_update = function( p ) {
		return $http( { url: apiurl + 'api/players/' + p + '/update/?callback=JSON_CALLBACK', method: 'JSONP' } ).then( function( response ) {
			if( 'dbug' in parseUrl() ) { console.log( response.data ); }
			return new theLiz( response.data );
		} );
	}
	theLiz.race = function () {
	  return $http({ url: apiurl + 'api/race/?callback=JSON_CALLBACK', method: 'JSONP' }).then(function (response) {
	    if ('dbug' in parseUrl()) { console.log(response.data); }
	    return new theLiz(response.data);
	  });
	}
	theLiz.racemap = function (m, ruleset, weapons) {
	  return $http({ url: apiurl + 'api/race/maps/' + m + '/?callback=JSON_CALLBACK&weapons=' + weapons + "&ruleset="+ruleset, method: 'JSONP' }).then(function (response) {
	    if ('dbug' in parseUrl()) { console.log(response.data); }
	    return new theLiz(response.data);
	  });
	}
	theLiz.raceplayer = function (p, ruleset, weapons) {
	  return $http({ url: apiurl + 'api/race/players/' + p + '/?callback=JSON_CALLBACK&weapons=' + weapons + "&ruleset=" + ruleset, method: 'JSONP' }).then(function (response) {
	    if ('dbug' in parseUrl()) { console.log(response.data); }
	    return new theLiz(response.data);
	  });
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
.filter( 'ruleset', function() {
	return function( r ) {
		if( r == 1 ) return "";
		else if( r == 2 ) return "PQL";
		else return "";
	}
} )
.filter( 'ranked', function() {
	return function( r ) {
		if( r == 1 ) return "";
		else return "unranked_icon";
	}
} )
.filter( 'premium', function() {
	return function( r ) {
		if( r == 1 ) return "premium_icon";
		else if( r == 0 ) return "";
		else return "";
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
} )
.filter( 'team', function() {
	return function( t ) {
		if( t == '2' ) { return "success" }
		else if( t == '1' ) { return "danger" }
		else return "";
	}
} )
.filter( 'lower', function() {
	return function lower( str ) {
		return str.toLowerCase();
	}
} )
.filter( 'cleanclan', function() {
	return function( c ) {
		if( c == 'None' ) { return '' }
		else { return c; }
	}
} )
.filter('gametype', function () {
  return function (input) { return input == "harv" ? "harvester" : input.toLowerCase(); }
})
.filter('teamname', function () {
  return function (input) { input = parseInt(input); return input == 1 ? "Red" : input == 2 ? "Blue" : ""; }
});

function convertTimestamp(timestamp) {
	var d = new Date(timestamp * 1000), // Convert to milliseconds
			yyyy = d.getFullYear(),
			mm = ('0' + (d.getMonth() + 1)).slice(-2),  // Months are zero based. Add leading 0.
			dd = ('0' + d.getDate()).slice(-2),         // Add leading 0.
			hh = d.getHours(),
			h = hh,
			min = ('0' + d.getMinutes()).slice(-2),     // Add leading 0.
			ampm = 'AM',
			time;
	if (hh > 12) {
		h = hh - 12;
		ampm = 'PM';
	}
	else if (hh == 0) {
		h = 12;
	}
	// ie: 2013-02-18, 8:35 AM  
	time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
	return time;
}
function shortenPID( pid ) {
	return pid.split( '-' )[0];
}
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
function timediff( d1, d2 ) {
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


