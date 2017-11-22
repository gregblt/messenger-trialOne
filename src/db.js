var couch = require('./couchdb');

module.exports = {
	createDB: function () {
	  	couch.db.create('fbid', function(err) {  
		    if (err && err.statusCode != 412) {
		      console.error(err);
		    }
		    else {
		      console.log('database exists');
		    }
		});
	}
};


