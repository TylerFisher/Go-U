// TODO:
// * Use a templating engine

(function() {
    var $ = jQuery;

    // Livestream setup
    var livestream = function() {

        var self = this;

        self.previous_data = null;

        self.params = {
            type: 'GET',
            dataType: 'jsonp',
            url: config.DATA_FILE,
            jsonp: false,
            jsonpCallback: 'ev',
            processData: false,
            success: function(data) {
                self.success(data);
            }
        };

        self.success = function(data) {
            if ( typeof data != 'undefined' ) {
                check = ( self.previous_data === null );

                if ( check || (data.embed[0] !== self.previous_data.embed[0]) ) {
                    $("#embed").html(data.embed[0]);
                }

                if ( check || (data.upnext[0] !== self.previous_data.upnext[0]) ) {
                    $("#upnext").hide();

                    if ( data.upnext[0] !== '' ) {
                        $("#upnext").html(
                            '<div class="alert alert-success"><h4>' + data.upnext[0] + '</h4></div>');
                    } else {
                        $("#upnext").html('');
                    }

                    $("#upnext").fadeIn(750);

                }

                if ( check || (data.twitter_handles.sort().toString() !==
                        self.previous_data.twitter_handles.sort().toString()) ) {

                    if ( data.twitter_handles[0] !== '' ) {
                        stream_opts = {
                            limit: 5,
                            handles: data.twitter_handles
                        };
                        tweeter_opts = {
                            handles: data.twitter_handles
                        };
                    } else {
                        stream_opts = {limit: 5};
                        tweeter_opts = {};
                    }
                    window.twitterstream = new twitterstream(stream_opts);
                    window.tweeters = new tweeters(tweeter_opts);
                }

                self.previous_data = data;
            }
        };

        self.fetch = function() {
            $.ajax(self.params);
        };

        self.poll = function() {
            // Start polling for updates to live stream
            setInterval(function() {
                self.fetch();
            }, config.POLL_RATE);
        };

        self.start = function() {
            self.fetch();
            self.poll();
            return self;
        };

        return self.start();
    };

    // Twitter stream setup
    var twitterstream = function(opts) {

        var self = this;
        var defaults = {
            limit: 8,
            container: '#tweets',
            allow_more: true,
            handles: config.DEFAULT_TWITTER_HANDLES
        };
        self = $.extend(self, defaults, opts);

        self.refresh_url = null;

        self.endpoint = "http://search.twitter.com/search.json";

        self.query = function() {
            var q = 'from:';

            $.each(self.handles, function(i, handle) {
                q += handle;

                if ( handle !== self.handles[self.handles.length - 1] )
                    q += ' OR from:';
            });

            return '?q=' + escape(q);
        };

        self.ajax_url = function() {
            return self.endpoint + self.query() + "&rpp=" + self.limit + "&include_entities=true";
        };

        self.template = '<div class="tweet well well-small"><div class="tweet-thumb"></div><div class="tweet-author"><div class="tweet-name"></div> <div class="tweet-handle"></div> <div class="tweet-date"></div><div class="tweet-body"></div><div class="tweet-actions"><span class="tweet-reply"></span> <span class="tweet-retweet"></span> <span class="tweet-favorite"></span></div></div></div>';

        self.format_tweet = function(tweet) {
            var elem = $(self.template);

            elem.find('.tweet-thumb').html(
                '<img src="' + tweet.profile_image_url + '" />');
            elem.find('.tweet-name').html(
                '<a href="http://twitter.com/' +
                tweet.from_user +'">' +
                tweet.from_user_name +
                '</a>');
            elem.find('.tweet-handle').html('@' + tweet.from_user);
            elem.find('.tweet-body').html(
                self.link_entities(tweet)
            );
            elem.find('.tweet-date').attr('data-date', tweet.created_at);
            elem.find('.tweet-reply').html(
                '<a target="_blank" href="http://twitter.com/intent/tweet?in_reply_to=' +
                tweet.id_str + '"><i class="icon-share-alt"></i>&nbsp;Reply</a>');

            elem.find('.tweet-retweet').html(
                '<a target="_blank" href="http://twitter.com/intent/retweet?tweet_id=' +
                tweet.id_str + '"><i class="icon-retweet"></i>&nbsp;Retweet</a>');

            elem.find('.tweet-favorite').html(
                '<a target="_blank" href="http://twitter.com/intent/favorite?tweet_id=' +
                tweet.id_str + '"><i class="icon-star"></i>&nbsp;Favorite</a>');

            elem.attr('data-id', tweet.id_str);

            return elem;
        };

        self.update_time_diffs = function() {
            $.each($('.tweet'), function(i, tweet) {
                var tweet_date = $(tweet).find('.tweet-date').attr('data-date');
                $(tweet).find('.tweet-date').html(
                    time_difference(new Date(), new Date(tweet_date))
                );
            });
        };

        // From: https://gist.github.com/442463
        self.link_entities = function(tweet) {
            if ( !(tweet.entities) )
                return escape_html(tweet.text);

            var index_map = {};
            $.each(tweet.entities.urls, function(i, entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {
                    return "<a href='"+escape_html(entry.url)+"'>"+escape_html(text)+"</a>";
                }];
            });
            $.each(tweet.entities.hashtags, function(i, entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {
                    return "<a href='http://twitter.com/search?q="+escape("#"+entry.text)+"'>"+escape_html(text)+"</a>";
                }];
            });
            $.each(tweet.entities.user_mentions, function(i, entry) {
                index_map[entry.indices[0]] = [entry.indices[1], function(text) {
                    return "<a title='"+escape_html(entry.name)+"' href='http://twitter.com/"+escape_html(entry.screen_name)+"'>"+escape_html(text)+"</a>";
                }];
            });

            var result = "";
            var last_i = 0;
            var i = 0;
            for (i=0; i < tweet.text.length; ++i) {
                var ind = index_map[i];
                if (ind) {
                    var end = ind[0];
                    var func = ind[1];
                    if (i > last_i)
                        result += escape_html(tweet.text.substring(last_i, i));

                    result += func(tweet.text.substring(i, end));
                    i = end - 1;
                    last_i = end;
                }
            }

            if (i > last_i)
                result += escape_html(tweet.text.substring(last_i, i));

            return result;
        };

        self.params = {
            type: 'GET',
            dataType: 'jsonp',
            url: self.ajax_url(),
            success: function(data) {
                self.success(data);
            }
        };

        self.success = function(data) {
            self.refresh_url = data.refresh_url;

            data.results.reverse();
            $.each(data.results, function(i, tweet) {

                elem = self.format_tweet(tweet);

                $(self.container).prepend(elem);
                elem.fadeIn(1000);
            });

            self.update_time_diffs();
        };

        self.fetch = function() {
            $.ajax(self.params);
        };

        self.poll = function() {
            // Start polling for new tweets
            setInterval(function() {
                self.params.url = self.endpoint +
                    self.refresh_url  + "&rpp=5&include_entities=true";

                $.ajax(self.params);
            }, 30000);
        };

        self.show_older = function() {
            var params = self.params;

            params.success = function(data) {

                data.results.reverse().pop();
                $.each(data.results, function(i, tweet) {

                    elem = self.format_tweet(tweet);

                    $(self.container).append(elem);
                    elem.fadeIn(1000);
                });

                self.update_time_diffs();

            };

            var oldest = $('.tweet')[$('.tweet').length - 1];

            params.url = self.endpoint + self.query() +
                "&rpp=" + (self.limit + 1) + "&include_entities=true" +
                "&max_id=" + $(oldest).attr('data-id');

            $.ajax(params);

            return false;
        };

        self.start = function() {
            self.fetch();
            self.poll();

            if (self.allow_more) {
                $(self.container).after(
                    '<a class="btn btn-primary"' +
                    'id="show-more-tweets" href="#">Show 5 more tweets &raquo;</a>');
                $('#show-more-tweets').click(self.show_older);
            }

            return self;
        };

        return self.start();
    };

    // Setup tweeters
    var tweeters = function(opts) {

        var self = this;

        self = $.extend(self, {
            limit: 5,
            container: "#tweeters",
            handles: config.DEFAULT_TWITTER_HANDLES
        }, opts);

        self.endpoint = "http://api.twitter.com/1/users/show.json?screen_name=";

        self.template = '<div class="tweet-bio"><div class="tweet-thumb"></div><div class="tweet-author"><div class="tweet-name"></div> <div class="tweet-handle"></div> <div class="tweet-desc"></div></div>';

        self.success = function(data) {
            var elem = $(self.template);

            elem.find('.tweet-thumb').html(
                '<img src="' + data.profile_image_url + '" />');
            elem.find('.tweet-name').html(
                '<a href="http://twitter.com/' +
                data.screen_name +'">' +
                data.name +
                '</a>');
            elem.find('.tweet-handle').html('@' + data.screen_name);
            elem.find('.tweet-desc').html(data.description);

            $(self.container).prepend(elem);
            elem.fadeIn(1000);
        };

        self.params = {
            type: 'GET',
            dataType: 'jsonp',
            success: function(data) {
                self.success(data);
            }
        };

        self.populate = function() {
            $("#tweeters").html("");

            var handles = self.handles;

            $.each($.randomize(handles), function(i, handle) {
                if ( i == self.limit )
                    return false;

                var params = $.extend(
                    self.params, {url: self.endpoint + handle});
                $.ajax(params);
            });
        };

        self.start = function() {
            self.populate();
            return self;
        };

        return self.start();
    };


    // Utilities
    var escape_html = function(text) {
        return $('<div/>').text(text).html();
    };

    // From: http://stackoverflow.com/questions/6108819/javascript-timestamp-to-relative-time-eg-2-seconds-ago-one-week-ago-etc-best
    var time_difference = function(current, previous) {

        var msPerMinute = 60 * 1000;
        var msPerHour = msPerMinute * 60;
        var msPerDay = msPerHour * 24;
        var msPerMonth = msPerDay * 30;
        var msPerYear = msPerDay * 365;

        var elapsed = current - previous;

        if (elapsed < msPerMinute) {
            return Math.round(elapsed/1000) + ' seconds ago';
        }

        else if (elapsed < msPerHour) {
            return Math.round(elapsed/msPerMinute) + ' minutes ago';
        }

        else if (elapsed < msPerDay ) {
            return Math.round(elapsed/msPerHour ) + ' hours ago';
        }

        else if (elapsed < msPerMonth) {
            return 'approximately ' + Math.round(elapsed/msPerDay) + ' days ago';
        }
    };

    // From: http://onwebdev.blogspot.com/2011/05/jquery-randomize-and-shuffle-array.html
    $.randomize = function(arr) {
        for(var j, x, i = arr.length; i; j = parseInt(Math.random() * i, 10), x = arr[--i], arr[i] = arr[j], arr[j] = x);
        return arr;
    };

    $(document).ready(function() {
        window.livestream = new livestream();
    });
})();
