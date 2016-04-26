var ChatHandler = function(server) {

	this.convHandler = require('../handler/convHandler.js')();
	var DBService = require('../service/dbService.js');
	this.dbService = new DBService();
	this.io = require("socket.io")(server);
	this.nameSpaces = ["/defaultChat"];
	this.rooms = [];
	this.adminSocket = null;
	this.defaultNsp = this.io.of(this.nameSpaces[0]);
	this.isAdminConnected = false;
	this.socketList = {};
	var that = this;
	this.defaultNsp.on("connection",function(socket){

	socket.on("initialize",function(userDataString){ that.initialize(userDataString,socket);});

	socket.on("adminConnect",function(messageString){ that.adminConnect(messageString,socket); });

	socket.on("message",function(msgStringObj){ that.sendMessage(msgStringObj,socket); });
});

}	


ChatHandler.prototype.initialize = function(userDataString,socket) {

	var userData = JSON.parse(userDataString);
	socket["sender"] = userData["sender"];
	socket["recepient"] = userData["recepient"];
	var convId = this.addConv(socket.sender,socket.recepient);
	var roomId = convId;
	console.log("RETURNED CONV ID IS : "+convId);
	this.initializeRoom(roomId,userData);
	console.log("TRYING TO JOIN A ROOM : "+roomId);
	socket.join(roomId);
	socket.room = roomId;
	this.socketList.roomId = socket;
};

ChatHandler.prototype.initializeRoom = function(roomID,userData)
{
	this.rooms.unshift(roomID);
}


ChatHandler.prototype.adminConnect = function(messageString,socket)
{
	console.log("Admin connecting !!!");
	this.isAdminConnected = true;
	this.adminSocket = socket;
	var newConnTransmitObject;
	var socketConnected;
	/*conversations["conversations"].forEach(function(convObj){
		console.log("Admin joining a room"+convObj["roomID"]);
		adminSocket.join(convObj["roomID"]);
		var clients = defaultNsp.in(convObj["roomID"]).clients(function(error,clients){return clients;});
		for(var property in clients)
		{
			console.log(property+" : "+clients.property);
		}
		var newObj = {sender:convObj["participant1"],recepient:convObj["participant1"]};
		adminSocket.emit("initClients", JSON.stringify(newObj));
	});*/
	//initialize(messageString,socket);
	/*for(var property in defaultNsp.connected)
	{
		var connectedSocket = defaultNsp.connected[property];
		var newConnTransmitObject = {message:"Hi, This is Srikanth here, How are you doing?" , sender: "administrator",recepient: connectedSocket[""]};
		var user = connectedSocket["sender"];
		console.log(property+":"+user);
		if(user!= 'administrator')
		{
			connectedSocket.emit("message",JSON.stringify(newConnTransmitObject));
		}
	}*/
}


ChatHandler.prototype.adminNotConnected = function(socket)
{
	var newConnTransmitObject = {message:"Hi, Sorry, I am not available right now, I will reach out to you as soon as I am back" , sender: "administrator",recepient: socket["sender"]};
	socket.emit("message",JSON.stringify(newConnTransmitObject));
}



ChatHandler.prototype.sendMessage = function(msgStringObj,socket)
{
		console.log("Received message , Sending it back "+msgStringObj);
		var curTime = this.getCurrentTime();
		var that = this;
		var convId = -1;
		var p = new Promise(function(resolve,reject) {
			convId = that.processMessage(msgStringObj,resolve,reject);
		});

		p.then(function(resultSet){

			that.defaultNsp.in(convId).emit("message",msgStringObj);
		}).catch(function(err){
			console.log("INSIDE CHAT HANDLER"+err);
		});

		//fs.readFile("./chatData/"+socket["sender"]+"_"+socket["recepient"]+".json",'utf8',function(readErr,data){
		// console.log("Error during reading is "+readErr);
		// var existingMsgs = JSON.parse(data);
		// existingMsgs.push(msgDBObject);
		//console.log("Current message Length : "+curLen);
		// fs.writeFile("./chatData/"+socket["sender"]+"_"+socket["recepient"]+".json",JSON.stringify(existingMsgs),function(writeErr) {
		// 	console.log("Wrote the messages with error : "+writeErr);
		// });
	    /*});*/
		
}

ChatHandler.prototype.processMessage = function(msgToBeParsed,callback,callbackerr){
	
	var msgObject = JSON.parse(msgToBeParsed);
	return this.convHandler.addMsg(msgObject,callback,callbackerr);

};

ChatHandler.prototype.addConv = function(participant1,participant2){

	return this.convHandler.addConv(participant1,participant2);	
};

ChatHandler.prototype.fillList = function(req,res,callback,callbackerr)
{
	var currentUserObj = JSON.parse(req.query.userData);
	check(currentUserObj);
	var query = "select first_name,last_name,birth_date,join_date,email_id,firebase_id from mist01.mistuser ";
	query+= "where binary firebase_id<>'"+currentUserObj.firebaseId+"'";
	var that = this;
	console.log(query);
	var p = new Promise(function(resolve,reject) {
		that.dbService.executeQuery(query,resolve,reject);
	});
	p.then(function(resultSet){
		var friendData = [];
		resultSet.forEach(function(userRow){
			var userObj = {};
			userObj.firstName = userRow.first_name;
			userObj.lastName = userRow.last_name;
			userObj.email = userRow.email_id;
			userObj.firebaseId = userRow.firebase_id;
			friendData.push(userObj);
		});
		res.json(friendData);

	}).catch(function(err){
		console.log("ERROR IN CHAT HANDLER : "+err);
		res.end();
	});
};

function check(obj){
	for(var property in obj)
	{
		console.log(property+": "+obj[""+property]);
	}
}
ChatHandler.prototype.getCurrentTime = function() {
	var date = new Date();
	
	var hour = date.getHours();
	hour = (hour<10 ? "0":"")+hour;

	var min = date.getMinutes();
	min = (min<10 ? "0":"")+ min;

	var sec = date.getSeconds();
	sec = (sec<10? "0":"")+ sec;

	var year = date.getFullYear();

	var month = date.getMonth()+1;
	month = (month<10 ? "0":"")+ month;

	var day = date.getDate();
	day = (day < 10 ? "0": "")+ day;

	return month+"-"+day+"-"+year+" "+hour+":"+min+":"+sec;

}

module.exports = ChatHandler;