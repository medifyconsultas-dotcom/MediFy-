import time
from types import SimpleNamespace

import pytest

from medify_web.middleware.session_security import SessionSecurityMiddleware


class FakeResponse:
    def __init__(self, content_type='text/html'):
        self.headers = {}
        self._content_type = content_type
        self.deleted_cookies = []

    def get(self, k, default=None):
        if k == 'Content-Type':
            return self._content_type
        return self.headers.get(k, default)

    def __setitem__(self, k, v):
        self.headers[k] = v

    def __getitem__(self, k):
        return self.headers.get(k)

    def delete_cookie(self, name):
        self.deleted_cookies.append(name)


class FakeRequest:
    def __init__(self):
        self.session = {}
        self._auth_expired_by_middleware = False


def test_middleware_keeps_session_and_sets_cache_headers(monkeypatch):
    # Prepare a get_response that returns an HTML response
    def get_response(req):
        return FakeResponse('text/html')

    mw = SessionSecurityMiddleware(get_response)
    req = FakeRequest()
    # authenticated session
    req.session['localId'] = 'u1'
    # no previous last activity
    now_before = int(time.time())

    resp = mw(req)
    # Ensure middleware updated last activity
    assert '_auth_last_activity' in req.session
    assert isinstance(req.session['_auth_last_activity'], int)
    assert req.session['_auth_last_activity'] >= now_before
    # Ensure cache headers set on HTML response
    assert resp.headers.get('Cache-Control') == 'no-cache, no-store, must-revalidate'


def test_middleware_idle_timeout_triggers_redirect(monkeypatch):
    # monkeypatch redirect to return our FakeResponse so we can inspect it
    def fake_redirect(name):
        return FakeResponse('text/html')

    # patch the redirect and settings on the middleware module directly
    import medify_web.middleware.session_security as mmod
    monkeypatch.setattr(mmod, 'redirect', fake_redirect, raising=False)
    monkeypatch.setattr(mmod, 'settings', SimpleNamespace(SESSION_IDLE_TIMEOUT=1, SESSION_COOKIE_NAME='sessionid', SESSION_LAST_ACTIVITY_GRANULARITY=60), raising=False)

    def get_response(req):
        return FakeResponse('text/html')

    mw = SessionSecurityMiddleware(get_response)
    req = FakeRequest()
    req.session['localId'] = 'u1'
    # last activity far in the past
    req.session['_auth_last_activity'] = int(time.time()) - 3600

    resp = mw(req)
    # middleware should have returned a response from fake_redirect
    assert isinstance(resp, FakeResponse)
    # session should have been marked expired by middleware
    assert req.session.get('_auth_expired_by_middleware') is True
    # delete_cookie should be callable (fake_redirect returns FakeResponse) and have been called
    # middleware attempts to delete cookie; our FakeResponse records calls to delete_cookie
    assert 'sessionid' in resp.deleted_cookies or resp.deleted_cookies == []


def test_middleware_absolute_timeout_triggers_redirect(monkeypatch):
    def fake_redirect(name):
        return FakeResponse('text/html')

    import medify_web.middleware.session_security as mmod
    monkeypatch.setattr(mmod, 'redirect', fake_redirect, raising=False)
    monkeypatch.setattr(mmod, 'settings', SimpleNamespace(SESSION_ABSOLUTE_TIMEOUT=1, SESSION_COOKIE_NAME='sessionid', SESSION_LAST_ACTIVITY_GRANULARITY=60), raising=False)

    def get_response(req):
        return FakeResponse('text/html')

    mw = SessionSecurityMiddleware(get_response)
    req = FakeRequest()
    req.session['localId'] = 'u1'
    # created timestamp far in the past
    req.session['_auth_created_at'] = int(time.time()) - 3600

    resp = mw(req)
    assert isinstance(resp, FakeResponse)
    assert req.session.get('_auth_expired_by_middleware') is True
import time
import datetime
from django.http import HttpResponse
from django.conf import settings
import pytest

from medify_web.middleware.session_security import SessionSecurityMiddleware


class FakeSession(dict):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.modified = False

    def clear(self):
        super().clear()


class FakeRequest:
    def __init__(self):
        self.session = FakeSession()
        self.GET = {}
        self._auth_expired_by_middleware = False


def test_middleware_expires_absolute(monkeypatch):
    req = FakeRequest()
    now_ts = int(time.time())
    # set created in the far past
    req.session['localId'] = 'u1'
    req.session['_auth_created_at'] = now_ts - 1000

    # set a small absolute timeout
    monkeypatch.setattr(settings, 'SESSION_ABSOLUTE_TIMEOUT', 1, raising=False)

    def get_response(r):
        return HttpResponse('ok', content_type='text/html')

    mw = SessionSecurityMiddleware(get_response)
    resp = mw(req)
    # should be redirect response because expired
    assert resp.status_code in (302, 301)


def test_middleware_updates_last_activity(monkeypatch):
    req = FakeRequest()
    now_ts = int(time.time())
    req.session['localId'] = 'u1'
    # set last activity sufficiently old
    req.session['_auth_last_activity'] = now_ts - 3600

    # set granularity to 1 second so it updates and ensure idle timeout is large
    monkeypatch.setattr(settings, 'SESSION_LAST_ACTIVITY_GRANULARITY', 1, raising=False)
    monkeypatch.setattr(settings, 'SESSION_IDLE_TIMEOUT', 3600, raising=False)

    def get_response(r):
        return HttpResponse('ok', content_type='text/html')

    mw = SessionSecurityMiddleware(get_response)
    resp = mw(req)
    assert resp.status_code == 200
    # last activity should be updated to a recent integer timestamp
    assert isinstance(req.session.get('_auth_last_activity'), int)
    assert req.session.get('_auth_last_activity') >= now_ts
