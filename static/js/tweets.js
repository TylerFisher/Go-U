var search = function () {
        var url = "http://search.twitter.com/search.json?q=b1gcats&callback=?";
        $.getJSON(url, handleRequest);
    }

function handleRequest(data) {
    $('#tweets').empty();
    console.log(data.results[0]['text']);
    
    for (var i = 0; i < data.results.length; i++) {
        $('#tweets').append(buildTweet(data.results[i]));
    }
}

function buildTweet(tweet) {
    var tweetHTML = "<div class='tweet'>";
    tweetHTML += "<div class='user_img'><img src='" + tweet['profile_image_url'] + "'></div>";
    tweetHTML += "<div class='tweet_info'>"
    tweetHTML += "<div class='user'>" + tweet['from_user_name'] + "</div>";
    tweetHTML += "<div class='tweet_text'>" + tweet['text']; + "</div></div>"
    tweetHTML += "</div>";
    return tweetHTML;
}

$(document).ready(function () {
    search();
    var interval=setInterval(function(){search()},60000);
});
