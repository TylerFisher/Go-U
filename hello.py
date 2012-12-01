from flask import Flask
from flask_oauth import OAuth
from flask import session

app = Flask(__name__)

url_for('static', filename='stylesheets/screen.css')

@app.route('/')
def hello_world():
    return 'Hello World!'

if __name__ == '__main__':
    app.run(debug=True)

def twitter_call():
    oauth = OAuth()
    twitter = oauth.remote_app('twitter',
        base_url='https://api.twitter.com/1.1/',
        request_token_url='https://api.twitter.com/oauth/request_token',
        access_token_url='https://api.twitter.com/oauth/access_token',
        authorize_url='https://api.twitter.com/oauth/authenticate',
        consumer_key='IOvCZlOF3IHPqciM5tbDEA',
        consumer_secret='qLBqyus7BiEqm88cx08cnjBme0Dye1oemM2XdXtmKs'
    )

    @twitter.tokengetter
    def get_twitter_token(token=None):
        return session.get('twitter_token')

    resp = twitter.get('search/tweets.json?q=B1GCats')
    if resp.status == 200:
        tweets = resp.data
    else:
        tweets = None
        flash('Unable to load tweets from Twitter. Maybe out of '
              'API calls or Twitter is overloaded.')

