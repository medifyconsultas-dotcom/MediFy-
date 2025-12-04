import time
import datetime
from django.conf import settings
from django.shortcuts import redirect


class SessionSecurityMiddleware:
    """Middleware para impor timeouts de sessão:
    - SESSION_IDLE_TIMEOUT: tempo de inatividade (segundos) antes de expirar
    - SESSION_ABSOLUTE_TIMEOUT: tempo absoluto desde login para expirar

    Ao expirar, a sessão é limpa (flush). O middleware atualiza `last_activity` a cada
    request para implementar sliding expiration.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.idle_timeout = getattr(settings, 'SESSION_IDLE_TIMEOUT', 60 * 30)
        self.absolute_timeout = getattr(settings, 'SESSION_ABSOLUTE_TIMEOUT', 60 * 60 * 24 * 7)

    def __call__(self, request):
        try:
            session = request.session
        except Exception:
            return self.get_response(request)

        # Only apply to authenticated session-like flows: presence of uid/localId
        uid = session.get('localId') or session.get('uid')
        if uid:
            now_ts = int(time.time())
            created = session.get('_auth_created_at')
            last = session.get('_auth_last_activity')

            # Check absolute timeout
            try:
                if created:
                    if isinstance(created, (int, float)):
                        created_ts = int(created)
                    else:
                        created_ts = int(float(created))
                    if now_ts - created_ts > int(self.absolute_timeout):
                        # Instead of flushing (which can cause UpdateError when
                        # Django's session middleware later tries to save), clear
                        # the session data and mark it expired. We set a request
                        # attribute and continue so that we can perform a proper
                        # redirect after the view runs and also set cache headers
                        # on the response.
                        try:
                            # Debug: log expiry reason to a file for troubleshooting
                            try:
                                with open('session_expiry.log', 'a', encoding='utf-8') as _f:
                                    _f.write(f"ABS_EXPIRE uid={uid} created={created} last={last} now={now_ts}\n")
                            except Exception:
                                pass
                            session.clear()
                            session['_auth_expired_by_middleware'] = True
                            session.modified = True
                        except Exception:
                            pass
                        request._auth_expired_by_middleware = True
            except Exception:
                # swallow and continue
                pass

            # Check idle timeout
            try:
                if last:
                    if isinstance(last, (int, float)):
                        last_ts = int(last)
                    else:
                        last_ts = int(float(last))
                    if now_ts - last_ts > int(self.idle_timeout):
                        try:
                            try:
                                with open('session_expiry.log', 'a', encoding='utf-8') as _f:
                                    _f.write(f"IDLE_EXPIRE uid={uid} created={created} last={last} now={now_ts}\n")
                            except Exception:
                                pass
                            session.clear()
                            session['_auth_expired_by_middleware'] = True
                            session.modified = True
                        except Exception:
                            pass
                        request._auth_expired_by_middleware = True
            except Exception:
                pass

            # update last activity timestamp only occasionally to avoid
            # writing the session on every single request. Use a granularity
            # (seconds) from settings to control how often we persist the
            # timestamp. This dramatically reduces DB writes when using
            # DB-backed sessions (SQLite) during development.
            try:
                gran = getattr(__import__('django.conf').conf.settings, 'SESSION_LAST_ACTIVITY_GRANULARITY', 60)
            except Exception:
                gran = 60
            try:
                last_ts = None
                last = session.get('_auth_last_activity')
                if last:
                    try:
                        last_ts = int(last)
                    except Exception:
                        try:
                            last_ts = int(float(last))
                        except Exception:
                            last_ts = None
                # only update if there was no last timestamp or enough time passed
                if last_ts is None or (now_ts - last_ts) >= int(gran):
                    session['_auth_last_activity'] = now_ts
                    # mark modified so Django will save the session (only when changed)
                    try:
                        session.modified = True
                    except Exception:
                        pass
            except Exception:
                pass

        response = self.get_response(request)

        # Ensure HTML responses are not cached by the browser so Back button
        # doesn't show a stale authenticated page.
        try:
            ctype = response.get('Content-Type', '')
            if ctype and 'text/html' in ctype:
                response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                response['Pragma'] = 'no-cache'
                response['Expires'] = '0'
        except Exception:
            pass

        # If we flagged the request as expired, redirect to login now.
        try:
            if getattr(request, '_auth_expired_by_middleware', False):
                resp = redirect('medify_web:auth')
                resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                resp['Pragma'] = 'no-cache'
                resp['Expires'] = '0'
                # delete the session cookie from the client
                try:
                    resp.delete_cookie(settings.SESSION_COOKIE_NAME)
                except Exception:
                    pass
                return resp
        except Exception:
            pass

        return response
