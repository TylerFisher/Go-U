from flask import Flask, json, flash, session
from flask.ext.login import UserMixin, login_user, logout_user
from utils import read, write, delete, slugify
from p2p.auth import authenticate
from config import P2P_AUTH_URL

class App(Flask):

    def create_or_edit_data(self, data):
        data = dict(data)
        slug = slugify(data['title'][0])
        existing_data = self.read_data(slug)

        if existing_data:
            flash(
                ("Found and loaded an existing second screen: %s"
                    % data['title'][0]),
                "info")
            return existing_data
        else:
            data['slug'] = [slug, ]

            write(
                'secondscreen/%s/data.json' % slug,
                "ev(%s)" % json.dumps(data),
                public=True, meta={"Content-Type": "application/json"})
            return data

    def update_data(self, data):
        data = dict(data)
        slug = slugify(data['title'][0])
        try:
            if data['twitter_handles'][0].strip() != '':
                data['twitter_handles'] = [
                    handle.strip() for handle
                    in data['twitter_handles'][0].split(',')
                ]
        except KeyError:
            pass
        write(
            'secondscreen/%s/data.json' % slug, "ev(%s)" % json.dumps(data),
            public=True, meta={"Content-Type": "application/json"})
        return data

    def read_data(self, title_or_slug):
        slug = slugify(title_or_slug)
        try:
            data = read(
                'secondscreen/%s/data.json' % slug).strip("ev(").strip(")")
        except AttributeError:
            data = None
        try:
            data = json.loads(data)
        except ValueError:
            data = json.loads('{}')
        except TypeError:
            data = json.loads('{}')
        return data

    def delete_data_and_page(self, title_or_slug):
        slug = slugify(title_or_slug)
        delete('secondscreen/%s/index.html' % slug)
        delete('secondscreen/%s/data.json' % slug)
        delete('secondscreen/%s' % slug)
        return True

class User(UserMixin):
    def __init__(self, user, *args, **kwargs):
        self.fields = [
            'username', 'first_name', 'last_name',
            'email', 'token', 'password', ]
        self.load(user)

    def load(self, user):
        for field in self.fields:
            if field in user.keys():
                setattr(self, field, user[field])
        try:
            setattr(self, 'id', user['token'])
        except KeyError:
            setattr(self, 'id', None)
            setattr(self, 'token', None)
        # Stash this object in session
        # so we can retrieve it later
        session[self.get_id()] = self

        return self

    def is_authenticated(self):
        try:
            if self.token:
                return True
            else:
                return False
        except AttributeError:
            return False

    def is_anonymous(self):
        if not self.is_authenticated():
            return True
        else:
            return False

    def authenticate(self, remember=False, force=False):
        if self.username is not None and self.password is not None:
            user = authenticate( **{
                    'username': self.username,
                    'password': self.password,
                    'token': self.token,
                    'auth_url' : P2P_AUTH_URL
                })
            login_user(self, remember, force)

            return self.load(user)
        else:
            raise NotImplementedError

    @staticmethod
    def get(user_id):
        return session[user_id]