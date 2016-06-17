/**
 * Created by yu on 2016/6/7.
 */



var sql             = require('msnodesql');
var request          = require('request');
var app             = require('express')();
var bodyParser      = require("body-parser");  
var log4js          = require('log4js');
var os              = require('os');  
var ping            = require('ping');
var moment          = require('moment')
var iconv = require("iconv-lite");


var tools =  require('./public.js');

//监听端口
var port = 80;
//本地服务器地址
var local_addr = '127.0.0.1';


//远程服务器端口
var remote_port = 8080;
//远程服务器地址
var remote_server = "192.168.1.106";

var remote_url = "http://"+remote_server+":"+remote_port


//sql server 数据库连接串
var conn_str = "Driver={SQL Server Native Client 10.0};Server={192.168.1.105};Database={KeerHis};uid=sa;PWD=sa;";

var interfaces = os.networkInterfaces();

for(var key  in interfaces){
    var inter = interfaces[key];
    for(var i =0; i<inter.length;i++){
        if(inter[i].family =='IPv4' && inter[i].internal==false){  
            local_addr=inter[i].address; 
            
        }  
    }
}  


// ping.promise.probe(remote_server)
//     .then(function (res) {
//         if(res.alive==false){
//             logger.error("远程服务器地址："+remote_server+"无法ping通,请检查本地配置");
//             //throw new Error("远程服务器地址："+remote_server+"无法ping通,请检查本地配置");
//         }else{
            
//         }
// });  

var server = app.listen(port||80,local_addr,function(err){
    if(err){
        console.log('创建服务器失败',err);
        return;
    }

    var host = server.address().address
    var port = server.address().port

    console.log("服务器创建成功,地址:http://%s:%s", host, port)
})


app.set('env','development');
moment.locale('zh-cn');

log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('logs/sql.log'), 'nodeJs logging');
var logger = log4js.getLogger('sql server');
logger.setLevel('DEBUG');

logger.debug('log beginning:',moment().format('LLLL'));


//使用post参数解析中间件
app.use(bodyParser.urlencoded({extended: false})); 

app.get('/',function(req,res){
    res.send('hello word');
});

function uploadInfo(req,res,config,sqlStr,cb){
	var loop=true;
	var curPostNum= 0,curPostSuccussNum=0,dataLen=0;
	
    logger.debug('uploadInfo:'+sqlStr);
	
    sql.queryRaw(config.conn_str,sqlStr,
	
        function (err, results) {
            if(err){
                logger.error('uploadInfo:'+sqlStr+"--->"+err);
                res.send('0');
                return ;
            }
			
            
            var data = tools.sqlDataFormat(results);
			dataLen = data.length;
			
			logger.debug('总共查询到:'+data.length+"条记录"); 
			
			
			if(!cb || typeof cb !="function"){
				cb = function(p){
				return p;
				}
			}
			
			logger.debug("服务端请求链接:"+config.url); 
			if(data instanceof Array ){
				for(var i =0;i<dataLen;i++){
					var ret = cb(data[i]);
					request.post(config.url, {form: ret},post_cb);
				}
			}        
        });
		
	function post_cb(err, httpResponse,body){
		curPostNum++;
		
		if (err) {
			console.log("Error running post!");
			return;
		}
		
		var tojson = {prm_appcode:'-1'};
		
		
		try{
			tojson = JSON.parse(body);
		}catch(e){
			logger.error(e);
		}
		
		if(tojson.prm_appcode==0){
			curPostSuccussNum++;
		}else{
			console.log(tojson);
		}

		if(dataLen == curPostNum){
			logger.debug({Success:curPostSuccussNum,Total:curPostNum,Msg:body['prm_errormsg']});
			res.jsonp({Success:curPostSuccussNum,Total:curPostNum,Msg:body['prm_errormsg']});
		}
	}
	

}

app.use('/getZyJzInfo',function(req,res) {
	var sqlStr = "select * from vw_fymx_zy WHERE rylsh ="+req.query.zyh;
	var config  = tools.get_config(req.query);	
	config.url+= '/sys/client/upLoadJsxx';
	
	console.log(config);
	
    uploadInfo(req,res,config,sqlStr);
})

app.use('/getMzJzInfo',function(req,res){
	var sqlStr = "select * from vw_fymx_mz WHERE rylsh ="+req.query.zyh;
	var config  = tools.get_config(req.query);
    uploadInfo(req,res,config,sqlStr,function(data){
		console.log(data);
	});
})


/* SQL> desc ka02k1
Name    Type           Nullable Default Comments 
------- -------------- -------- ------- -------- 
AKB020  VARCHAR2(20)                    医疗机构编码 
AKA060  VARCHAR2(20)                    药品编码 
AKA061  VARCHAR2(200)                   中文名称 
AKA062  VARCHAR2(30)   Y                英文名称 
AKA063  VARCHAR2(4)                     收费类别 
AKA064  VARCHAR2(3)                     处方药标志 
AKA065  VARCHAR2(3)                     收费项目等级 
AKA066  VARCHAR2(50)   Y        NULL    助记码   
AKA067  VARCHAR2(20)   Y                计量单位 
AKA073  VARCHAR2(20)   Y                规格     
AKA074  VARCHAR2(100)  Y                产地     
AKA075  VARCHAR2(100)  Y                批准文件号 
AKA068  NUMBER(14,2)   Y                标准价格 
UKA008  NUMBER(14,2)   Y                计算单价 
AKA069  NUMBER(8,4)                     自付比例 
AKA070  NUMBER(5,2)    Y                每次用量 
AKA071  NUMBER(3)      Y                每日次数 
AKA072  VARCHAR2(50)   Y                用法     
UKA010  VARCHAR2(1)    Y                可用标志 
UKA011  VARCHAR2(1)    Y                中心监控标志 
UKA012  VARCHAR2(1)    Y                审核标志 
UKA013  VARCHAR2(1)    Y                取消标志 
UKA014  VARCHAR2(200)  Y                取消原因 
AAE013  VARCHAR2(1000) Y        NULL    备注     
AAE011  VARCHAR2(64)   Y                经办人   
AAE036  DATE           Y                经办时间 
PRSENO  NUMBER(12)     Y                          */

var drugMap ={
	xmbm:'aka060b',
	dlbm:'aka063',
	xmmc:'aka061',
	zjm: 'aka066',
	xmgg:'aka073',
	xmcd:'aka074',
	pzwh:'aka075',
	dwmc:'aka067',
	jg:  'uka008'
}


app.use('/getDrugList',function(req,res){
	var config  = tools.get_config(req.query);
	var sqlStr = "select * from vw_xmzl where dlbm in('3','4')" ;
	config.url+= '/sys/client/uploadDrug';
	var akb020 = req.query.client.currentAkb020;
	config.url+= '?kb01.akb020='+req.query.client.currentAkb020+"&uid="+req.query.client.currentUid;
    uploadInfo(req,res,config,sqlStr,function(data){
		var ret ={};
		for(var key in data){
			ret[drugMap[key]] = data[key];
		}
		return ret;
	});
})


app.use('/getDiagsisList',function(req,res){
	var config  = tools.get_config(req.query);
	var sqlStr = "select * from vw_xmzl where dlbm not in('3','4')" ;
	config.ur+= '/sys/client';
    uploadInfo(req,res,config,sqlStr,function(data){
		console.log(data);
	});
})

















