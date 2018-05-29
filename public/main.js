// Start Socket App

var socket = io();
var iAm = "";
var myName = "";
var iAmIn = false;
var activeFriend = "";
var myAvatar = "";
var autoScroll = true;
var chatIsActive = false;
var friendNameNVP = [];
// Show login view

$('#view-login').css('display','inline');

//User trys login

$('#login-try-login').click(function(){
    var username = $('#login-username').val();
    var password = $('#login-password').val();
    socket.emit('user-login-try',username,password);
    iAm = username;
});

socket.on('login-error',function(err){
    $('#login-errors').html(err);
});

socket.on('login-success',function(name,avatar,friends){
    iAmIn = true;
    myAvatar = avatar;
    myName = name;
    $('#view-login').css('display','none');
    $('#view-users').css('display','inline');
    //set user page
    $('#user-active-name').html(name);
    $('#user-active-username').html($('#login-username').val());
    $('#user-active-avatar').attr('src',avatar);
    //Get users friends
    $.each(friends, function(k,v){
        socket.emit('user-get-friend-details',v);
    });
});

socket.on('have-friend-detail',function(friend,name,avatar){
    friendNameNVP[friend] = name;
    $('#panel-users').html($('#panel-users').html()+'<div class="container" id="user-'+friend+'"><div class="columns"><div class="column col-4"><figure class="avatar"><img src="'+avatar+'" alt="Avatar"></figure></div><div class="column col-6">'+name+'</div><div class="column col-1"><button class="btn btn-primary btn-success btn" onclick="openChat(\''+friend+'\')"><i class="icon icon-forward"></i></button></div></div></div><br />');
});

function openChat(friend){
    $('#view-users').css('display','none');
    $('#view-chat').css('display','inline');
    activeFriend = friend;
    //Load chat history
    $('#message-window').html('<center><img src="loading.gif"></center>');
    $('#chat-message').val('');
    chatIsActive = true;
    socket.emit('user-request-chat-history-json-builder',iAm,activeFriend);
    //socket.emit('user-request-chat-history',iAm,activeFriend);
}

$('#chat-back').on('click',function(){
    $('#view-users').css('display','inline');
    $('#view-chat').css('display','none'); 
    chatIsActive = false;
});

$('#send-chat').on('click',function(){
    var message = $('#chat-message').val();
    $('#chat-message').val('');
    var formattedMessage = '<div class="tile"><div class="tile-icon"><figure class="avatar"><img src="'+myAvatar+'" alt="Avatar"></figure></div><div class="tile-content"><p class="tile-title">'+myName+'</p><p class="tile-subtitle message-data">'+message+'</p></div></div>';
    $('#message-window').html($('#message-window').html()+formattedMessage);
    socket.emit('user-send-message-to',message,activeFriend,iAm);
    if(autoScroll){
        $("#message-window").animate({ scrollTop: $("#message-window").prop("scrollHeight") - $("#message-window").height() }, 0);
    }
    callUpdateChatLogJson(iAm,activeFriend,message);
    //callUpdateChatLog(iAm,activeFriend,formattedMessage);
});

socket.on('have-message-from',function(message,name,avatar){
    if(name == friendNameNVP[activeFriend]){
        var formattedMessage = '<div class="tile"><div class="tile-icon"><figure class="avatar"><img src="'+avatar+'" alt="Avatar"></figure></div><div class="tile-content"><p class="tile-title">'+name+'</p><p class="tile-subtitle message-data">'+message+'</p></div></div>';
        $('#message-window').html($('#message-window').html()+formattedMessage);
    }
    if(!activeFriend == iAm){
        callUpdateChatLogJson(iAm,activeFriend,message);
        //callUpdateChatLog(iAm,activeFriend,formattedMessage);
    }
    notify('New Message!','From '+ name,name);
    if(autoScroll){
        $("#message-window").animate({ scrollTop: $("#message-window").prop("scrollHeight") - $("#message-window").height() }, 0);
    }
});

function callUpdateChatLog(from,to,formatted){
    socket.emit('user-update-chat-log',from,to,formatted);
}

function callUpdateChatLogJson(from,to,message){
    socket.emit('user-update-chat-log-json',from,to,message);
}

socket.on('have-formatted-messages',function(messages){
    $('#message-window').html(messages);
    if(autoScroll){
        $("#message-window").animate({ scrollTop: $("#message-window").prop("scrollHeight") - $("#message-window").height() }, 0);
    }    
});

$('#chat-send-photo').on('click',function(){
    $('#modal-image-send').addClass('active');
});

$('#modal-image-send-close').on('click',function(){
    $('#modal-image-send').removeClass('active');
})

$('#chat-image-link-direct-go').on('click',function(){
    var image = $('#chat-image-link-direct').val();
    $('#chat-message').val('<img src="'+image+'">');
    $('#chat-image-link-direct').val('');
    $('#modal-image-send').removeClass('active');
});

function notify(title,content,from){
    if (Notification.permission != "granted"){
        Notification.requestPermission();
    }
    
    if(!chatIsActive || friendNameNVP[activeFriend] != from){
        var notification = new Audio("notif.mp3");
        notification.play();
        Push.create(title, {
            body: content,
            //icon: '/icon.png',
            timeout: 4000,
            onClick: function () {
                window.focus();
                this.close();
            }
        });
    }
};