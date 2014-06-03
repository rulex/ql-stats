ql-stats
========

Collects game stats from quakelive.com


#Installation

* Clone this repo
* Goto your local copy and run ```npm install```
* Create a database for ql-stats
* Setup the database by importing ```qlstats.sql``` to the database
* Rename cfg.json.sample to cfg.json and change the settings to suit your needs
* Run ```npm start```
* Go to http://localhost:8585/ (default port 8585)
* Get started by updating your latest matches by going to http://localhost:8585/api/players/<YOUR-QL-NICKNAME>/update

