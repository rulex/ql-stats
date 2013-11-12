-- INDEX... ?

DROP TABLE IF EXISTS `Games`;
CREATE TABLE `Games`(
	`PUBLIC_ID` varchar(36) NOT NULL,
	`OWNER` varchar(100),
	`MAP` varchar(100),
	`NUM_PLAYERS` int(11),
	`AVG_ACC` int(11),
	`PREMIUM` int(11),
	`RANKED` int(11),
	`RESTARTED` int(11),
	`RULESET` int(11),
	`TIER` int(11),
	`TOTAL_KILLS` int(11),
	`TOTAL_ROUNDS` int(11),
	`WINNING_TEAM` varchar(5),
	`TSCORE0` int(11),
	`TSCORE1` int(11),
	`FIRST_SCORER` varchar(100),
	`LAST_SCORER` varchar(100),
	`GAME_LENGTH` int(11),
	`GAME_TYPE` varchar(6),
	`GAME_TIMESTAMP` int(11),
	`DMG_DELIVERED_NICK` varchar(100),
	`DMG_DELIVERED_NUM` int(11),
	`DMG_TAKEN_NICK` varchar(100),
	`DMG_TAKEN_NUM` int(11),
	`LEAST_DEATHS_NICK` varchar(100),
	`LEAST_DEATHS_NUM` int(11),
	`MOST_DEATHS_NICK` varchar(100),
	`MOST_DEATHS_NUM` int(11),
	`MOST_ACCURATE_NICK` varchar(100),
	`MOST_ACCURATE_NUM` int(11),
--
	PRIMARY KEY( `PUBLIC_ID` )
);

DROP TABLE IF EXISTS `Players`;
CREATE TABLE `Players`(
	`PUBLIC_ID` varchar(36) NOT NULL,
	`PLAYER_NICK` varchar(100) NOT NULL,
	`PLAYER_CLAN` varchar(10) NOT NULL,
	`PLAYER_COUNTRY` varchar(10) NOT NULL,
	`QUIT` int(11),
	`RANK` int(11),
	`SCORE` int(11),
	`DAMAGE_DEALT` int(11),
	`DAMAGE_TAKEN` int(11),
	`KILLS` int(11),
	`DEATHS` int(11),
	`HITS` int(11),
	`SHOTS` int(11),
	`TEAM` varchar(4),
	`TEAM_RANK` int(11),
	`HUMILIATION` int(11),
	`IMPRESSIVE` int(11),
	`EXCELLENT` int(11),
	`PLAY_TIME` int(11),

	`G_K` float,

	`GL_H` float,
	`GL_K` float,
	`GL_S` float,

	`LG_H` float,
	`LG_K` float,
	`LG_S` float,

	`MG_H` float,
	`MG_K` float,
	`MG_S` float,

	`PG_H` float,
	`PG_K` float,
	`PG_S` float,

	`RG_H` float,
	`RG_K` float,
	`RG_S` float,

	`RL_H` float,
	`RL_K` float,
	`RL_S` float,

	`SG_H` float,
	`SG_K` float,
	`SG_S` float,

	PRIMARY KEY( `PLAYER_NICK`, `PUBLIC_ID` ),
	CONSTRAINT fk_Games_PUBLIC_ID FOREIGN KEY( `PUBLIC_ID` ) REFERENCES Games( `PUBLIC_ID` ) ON UPDATE CASCADE
);
