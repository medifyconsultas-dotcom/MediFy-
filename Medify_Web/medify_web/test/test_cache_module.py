import time
from datetime import datetime, timedelta

import medify_web.cache as cache_mod


def test_cache_decorator_caches_and_expires():
    # reset module caches
    cache_mod._cache.clear()
    cache_mod._cache_ttl.clear()

    calls = {'n': 0}

    @cache_mod.cache_firestore(ttl_minutes=1)
    def myfunc(x):
        calls['n'] += 1
        return f"val-{x}-{calls['n']}"

    # first call populates cache
    v1 = myfunc(1)
    assert calls['n'] == 1

    # second call returns cached value (no increment)
    v2 = myfunc(1)
    assert calls['n'] == 1
    assert v1 == v2

    # simulate expiration by setting TTL in the past
    cache_key = f"{myfunc.__name__}:{str((1,))}:{str({})}"
    cache_mod._cache_ttl[cache_key] = datetime.now() - timedelta(minutes=5)

    # next call should call the function again
    v3 = myfunc(1)
    assert calls['n'] == 2
    assert v3 != v2
