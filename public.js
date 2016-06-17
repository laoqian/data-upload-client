var request          = require('request');


exports.sqlDataFormat = function(queryResults){
    if(!queryResults){
        return null;
    }

    var j = 0,data =[];

    for (var i=0; i<queryResults.rows.length; i++) {
        j = 0;
		data[i]={};
        for (var key in queryResults.meta) {
            name = queryResults.meta[key].name.toLowerCase();
            data[i][name] = queryResults.rows[i][j++];
        }
    }

    return data;
}


exports.get_config = function(query){
	var client = query.client;
	var config = {};
	
	
	config.conn_str = "Driver={SQL Server Native Client 10.0};Server={"+client.sqlsrvip+","+client.sqlsrvport+"};Database={"+client.sqlsrvdb+"};uid="+client.sqlsrvuid+";PWD="+client.sqlsrvpwd+";"
	
    config.url = query.url;
	
	return config;
	
}













