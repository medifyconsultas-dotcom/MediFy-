from functools import wraps
from datetime import datetime, timedelta

# Simple cache implementation
_cache = {}
_cache_ttl = {}

def cache_firestore(ttl_minutes=5):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            now = datetime.now()
            
            # Check if we have a valid cached value
            if cache_key in _cache and _cache_ttl[cache_key] > now:
                return _cache[cache_key]
            
            # Get fresh value
            result = func(*args, **kwargs)
            
            # Cache the result
            _cache[cache_key] = result
            _cache_ttl[cache_key] = now + timedelta(minutes=ttl_minutes)
            
            return result
        return wrapper
    return decorator