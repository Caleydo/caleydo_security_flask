__author__ = 'Samuel Gratzl'

import caleydo_security_flask.flask_login

import hashlib

def hash_password(password, salt):
  return hashlib.sha512(password + salt).hexdigest()

class User(caleydo_security_flask.flask_login.User):
  def __init__(self, id, password, salt, roles):
    super(User, self).__init__(id)
    self.name = id
    self._password = password
    self._salt = salt
    self.roles = roles

  @property
  def is_authenticated(self):
    return True

  @property
  def is_active(self):
    return True

  def is_password(self, given):
    given_h = hash_password(given, self._salt)
    return given_h == self._password

class UserStore(object):
  def __init__(self):
    import caleydo_server.config

    self._users = [User(v['name'], v['password'], v['salt'], v['roles']) for v in
                   caleydo_server.config.get('caleydo_security_flask.users')]

  def load(self, id):
    return next((u for u in self._users if u.id == id), None)

  def load_from_key(self, api_key):
    parts = api_key.split(':')
    if len(parts) != 2:
      return None
    return next((u for u in self._users if u.id == parts[0] and u.is_password(parts[1])), None)

  def login(self, username, extra_fields = {}):
    return next((u for u in self._users if u.id == username and u.is_password(extra_fields['password'])), None)

  def logout(self, user):
    pass


def create():
  return UserStore()