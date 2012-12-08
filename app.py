#!/usr/bin/env python

import time
import urllib

from flask import flash, json, request, render_template, redirect, url_for
from flask.ext.login import LoginManager, login_required, current_user
from p2p.auth import P2PAuthError

from config import SECRET_KEY, DEBUG, S3_BUCKET, POLL_RATE, \
    DEFAULT_TWITTER_HANDLES
from models import App, User
from utils import get_url, write, ls
#
# Setup
#
application = App(__name__)
application.secret_key = SECRET_KEY

login_manager = LoginManager()
login_manager.login_view = 'login'
login_manager.setup_app(application)

@login_manager.user_loader
def load_user(userid):
    try:
        return User.get(userid)
    except Exception, e:
        return None

#
# Views
#

@application.route('/')
def home():
    return redirect(url_for('create'))

@application.route('/login', methods=['post', 'get'])
def login():
    context = {}
    if current_user.is_authenticated():
        return redirect(request.args.get("next") or url_for("home"))
    if request.method == "POST":
        username = str(request.form.get("username"))
        password = str(request.form.get("password"))
        remember = str(request.form.get("remember"))
        if username != '' and password != '':
            user = User({"username": username, "password": password})
            try:
                if remember == 'on':
                    user.authenticate(remember=True)
                else:
                    user.authenticate()
                return redirect(request.args.get("next") or url_for("home"))
            except P2PAuthError, e:
                flash(str(e), "error")

        if username == '':
            flash("You didn't enter a username.", "error")

        if password == '':
            flash("You didn't enter a password.", "error")

    if request.args.get("next"):
        next = urllib.quote(request.args.get("next"), safe="")
    else:
        next = None

    context['next'] = next

    return render_template('login.html', **context)

@application.route('/view/<slug>')
@application.route('/view/')
@application.route('/view')
def view(slug=None):
    if slug is None:
        return redirect(url_for('create'))

    data = application.read_data(slug)

    try:
        data['slug']
        data['title']
    except KeyError:
        return 'Page not found', 404

    context = {}

    context['data_file'] = get_url('secondscreen/%s/data.json' % slug)
    context['poll_rate'] = POLL_RATE
    context['twitter_handles'] = json.dumps(DEFAULT_TWITTER_HANDLES)
    context['title'] = data['title'][0]

    return render_template('index.html', **context)

@application.route('/create/', methods=['get', 'post'])
@application.route('/create', methods=['get', 'post'])
@login_required
def create():
    context = {}

    context['past_projects'] = ls()

    if request.method == 'POST':
        if request.form:
            data = application.create_or_edit_data(request.form)

            context = {}
            context['data_file'] = get_url(
                'secondscreen/%s/data.json' % data['slug'][0])
            context['poll_rate'] = POLL_RATE
            context['twitter_handles'] = json.dumps(DEFAULT_TWITTER_HANDLES)
            context['s3_prefix'] = 'http://%s/secondscreen' % S3_BUCKET
            context['title'] = data['title'][0]

            write(
                'secondscreen/%s/index.html' % data['slug'][0],
                render_template('index.html', **context),
                public=True,
                meta={"Content-Type": "text/html"}
            )

            return redirect('/edit/%s' % data['slug'][0])

    return render_template('create.html', **context)

@application.route('/edit/<slug>', methods=['get', 'post'])
@application.route('/edit/')
@application.route('/edit')
@login_required
def edit(slug=None):
    context = {}

    if request.method == 'POST':
        if request.form:
            try:
                if request.form['delete'] is not None:
                    application.delete_data_and_page(slug)
                    return redirect(url_for('create'))
            except KeyError:
                data = application.update_data(request.form)
                flash('Successfully udpated! (%s)' % time.strftime(
                    '%I:%M:%S %p', time.localtime()), 'success')
                context["embed"] = data['embed'][0].strip()
                context["upnext"] = data['upnext'][0].strip()
                context["twitter_handles"] = data['twitter_handles'][0].strip()
        else:
            flash(
                'There was a problem saving your update. Please try again.',
                'error')
    if slug is not None:
        data = application.read_data(slug)
    else:
        return redirect(url_for('create'))

    # If we don't have slug or title, we don't have a second screen
    try:
        context["slug"] = data['slug'][0].strip()
        context["title"] = data['title'][0].strip()
    except KeyError:
        return "Page not found", 404
    # These will be empty for new second screens
    try:
        context["embed"] = data['embed'][0].strip()
        context["twitter_handles"] = ', '.join(data['twitter_handles'])
        context["upnext"] = data['upnext'][0].strip()
    except KeyError as e:
        context[e.args[0]] = ''
    context['s3_bucket'] = S3_BUCKET
    return render_template('edit.html', **context)

if __name__ == '__main__':
    config = {
        "host": "0.0.0.0",
        "debug": DEBUG
    }
    application.run(**config)
