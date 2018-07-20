var siofu = require("socketio-file-upload");
var app = require('express')().use(siofu.router);
var http = require('http').Server(app);
var https = require('https');
var path = require('path');
var express = require('express');
var io = require('socket.io')(http);
var fs = require('fs');

var historyDir = "history/";

//Load from external file every 30 seconds
var server_userList = {

};

var server_socketLink={};
console.log('LOADING USERS FILE!');
SERVER_user_load_master();
//Start web server
http.listen(3000, function(){
    console.log('==== Chat Server Loaded ====');
});

// Fire Main File
app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});

// Serve Static
app.use(express.static(path.join(__dirname, 'public')));

// User Connection

io.on('connection', function(socket){
    // File uploader
    var uploader = new siofu();
    uploader.dir = __dirname + '/public/uploads';
    uploader.listen(socket);

    // User trys login
    socket.on('user-login-try', function(username,password){
        if(server_userList[username]){
            if(server_userList[username]['password'] == password){
                server_socketLink[username]=socket;
                //console.log('User added to socket list');
                socket.emit('login-success',server_userList[username]['name'],server_userList[username]['avatar'],server_userList[username]['friends']);
            }else{
                socket.emit('login-error','Invalid login details');
            }
        }else{
            socket.emit('login-error','Invalid login details');
        }
    });
    //Get friends details
    socket.on('user-get-friend-details',function(friend){
        //if user online
        socket.emit('have-friend-detail',friend,server_userList[friend]['name'],server_userList[friend]['avatar']);
    });

    socket.on('user-send-message-to',function(message,to,from){
        if(server_socketLink[to]){
            server_socketLink[to].emit('have-message-from',message,server_userList[from]['name'],server_userList[from]['avatar']);
        }
    });

    socket.on('user-update-chat-log',function(from,to,log){
        writeChatLog(from,to,log);
    });

    socket.on('user-update-chat-log-json',function(from,to,message){
        writeChatLogJson(from,to,message);
    });

    socket.on('user-request-chat-history',function(user,friend){
        getChatLog(user,friend,socket);
    });

    socket.on('user-request-chat-history-json-builder',function(user,friend){
        getChatLogJsonBuilder(user,friend,socket);
    });    

    socket.on('disconnect', function(){
        //User exits
    });
});

function SERVER_user_load_master(){
    var ttr = 10000;
    //This function handles the loading and reloading of the users file
    server_userList = JSON.parse(fs.readFileSync("users.json"));
    setTimeout(function(){SERVER_user_load_master();},ttr);
}

function writeChatLogJson(from,to,message){
    var messageJsonString = JSON.stringify({fromUser:from,toUser:to,messageConent:message});
	
    var userDir = historyDir+from;
    var userToDir = userDir+'/'+to;
    if (!fs.existsSync(userDir)){
        fs.mkdirSync(userDir);
    }
    if (!fs.existsSync(userToDir)){
        fs.mkdirSync(userToDir);
    }
    fs.appendFile(userToDir+'/json.json', messageJsonString+',', function (err) {
        if (err) throw err;
    });

    var userDir = historyDir+to;
    var userToDir = userDir+'/'+from;
    if (!fs.existsSync(userDir)){
        fs.mkdirSync(userDir);
    }  
    if (!fs.existsSync(userToDir)){
        fs.mkdirSync(userToDir);
    }

    fs.appendFile(userToDir+'/json.json', messageJsonString+',', function (err) {
        if (err) throw err;
    });    
}

function writeChatLog(from,to,log){
    var userDir = historyDir+from;
    var userToDir = userDir+'/'+to;
    if (!fs.existsSync(userDir)){
        fs.mkdirSync(userDir);
    }
    if (!fs.existsSync(userToDir)){
        fs.mkdirSync(userToDir);
    }

    fs.appendFile(userToDir+'/history.html', log, function (err) {
        if (err) throw err;
    });

    //Now do the same for the other user!!
    var userDir = historyDir+to;
    var userToDir = userDir+'/'+from;
    if (!fs.existsSync(userDir)){
        fs.mkdirSync(userDir);
    }  
    if (!fs.existsSync(userToDir)){
        fs.mkdirSync(userToDir);
    }

    fs.appendFile(userToDir+'/history.html', log, function (err) {
        if (err) throw err;
    });
}

function getChatLog(user,friend,socket){
    var chatHistoryFile = historyDir+user+'/'+friend+'/history.html';
    var history = "";
    if (!fs.existsSync(chatHistoryFile)){
    }else{
        fs.readFile(chatHistoryFile, 'utf8', function(err, contents) {
            //Build chat history
            socket.emit('have-formatted-messages',contents);
        });
    }
}

function getChatLogJsonBuilder(user,friend,socket){
    var chatHistoryFile = historyDir+user+'/'+friend+'/json.json';
    var history = "";
    if (!fs.existsSync(chatHistoryFile)){
        socket.emit('have-formatted-messages',"<center><span>Nothing here yet!</span></center>");
    }else{
        fs.readFile(chatHistoryFile, 'utf8', function(err, contents) {
            //Build chat history
            var contents = buildChatHistoryHtml(contents);
            socket.emit('have-formatted-messages',contents);
        });
    }
}

function buildChatHistoryHtml(json){
    json = json.substring(0, json.length - 1);
    var jsonVals = JSON.parse('['+json+']');
    var itCount = jsonVals.length;
    var currentCount = 0;
    var formattedMessageBuilt = "";
    while(currentCount < itCount){
        var myAvatar = server_userList[jsonVals[currentCount].fromUser].avatar;
        var myName = server_userList[jsonVals[currentCount].fromUser].name;
        var message = jsonVals[currentCount].messageConent;
        var formattedMessageTemplate = '<div class="tile"><div class="tile-icon"><figure class="avatar"><img src="'+myAvatar+'" alt="Avatar"></figure></div><div class="tile-content"><p class="tile-title">'+myName+'</p><p class="tile-subtitle message-data">'+message+'</p></div></div>';
        formattedMessageBuilt+=formattedMessageTemplate;
        currentCount ++;
    }
    return formattedMessageBuilt;
}