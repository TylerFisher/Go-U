var search = function () {
    var url = "http://search.twitter.com/search.json?q=b1gcats&callback=?";
    $.getJSON(url, handleRequest);
};

var first_tweet;

function handleRequest(data) {
    $('#tweets').empty();
    console.log(first_tweet);
    for (var i = 0; i < data.results.length; i++) {
        /*if (i == 0 && first_tweet == data.results[i]['text']) continue{
            continue;
        }*/
        if (first_tweet == "") {
            return false;
        }
        else if (first_tweet == data.results[i]['text']) {
            williejump(i);
        }
        $('#tweets').append(buildTweet(data.results[i]));
    };
    first_tweet = data.results[0]['text'];
};

function buildTweet(tweet) {
    var tweetHTML = "<div class='tweet'>";
    tweetHTML += "<div class='user_img'><img src='" + tweet['profile_image_url'] + "'></div>";
    tweetHTML += "<div class='tweet_info'>"
    tweetHTML += "<div class='user'>" + tweet['from_user_name'] + "</div>";
    tweetHTML += "<div class='tweet_text'>" + tweet['text']; + "</div></div>"
    tweetHTML += "</div>";
    return tweetHTML;
};

var williejump = function(jumps) {
    var number = parseInt($('#coin-number').innerHTML);
    for (i = 0; i < jumps; i++) {
        console.log(i);
        $('#willie').css("background-image", "url('../static/img/jumpingwillie.png')");
        number += 1;
        $('#coin-number').innerHTML = number;

        var myVar=setInterval(function(){sit()},2000);

        function sit(){
             $('#willie').css("backgroundImage", "url('../static/img/standingwillie.png')");
        }
    }
};


$(document).ready(function () {
    search();
    var interval=setInterval(function(){search()},10000);
});
