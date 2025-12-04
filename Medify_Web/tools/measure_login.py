"""
Simple login performance measurement tool for the Medify project.

Usage (PowerShell):
  py tools\measure_login.py --url http://localhost:8000/auth/ --email admin --password 12345 --requests 50 --concurrency 5 --use-session

What it does:
- Sends N login POST requests to the given URL, either sequentially or concurrently
- Measures per-request wall-clock time (seconds)
- Prints summary: min, median, mean, p90, p95, p99, max, stddev

Notes:
- Run this against a local server (manage.py runserver) or deployed instance.
- Use realistic credentials; the script does not create users.
- To measure server-side processing specifically, enable server logging of timings in `views_auth.auth_view` (optional) and compare.
"""
import argparse
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics


def do_request(url, email, password, session=None, timeout=15):
    data = {'email': email, 'senha': password}
    start = time.perf_counter()
    try:
        if session:
            r = session.post(url, data=data, timeout=timeout)
        else:
            r = requests.post(url, data=data, timeout=timeout)
        status = r.status_code
    except Exception as e:
        status = None
    end = time.perf_counter()
    return (end - start, status)


def run_sequential(url, email, password, n, use_session):
    times = []
    statuses = []
    sess = requests.Session() if use_session else None
    for i in range(n):
        t, s = do_request(url, email, password, session=sess)
        times.append(t)
        statuses.append(s)
    return times, statuses


def run_concurrent(url, email, password, n, concurrency, use_session):
    times = []
    statuses = []
    # If session reuse requested, each thread should have its own Session to be thread-safe,
    # but we also test the effect of reusing a single session if desired.
    shared_session = requests.Session() if use_session else None
    with ThreadPoolExecutor(max_workers=concurrency) as exe:
        futures = []
        for i in range(n):
            if shared_session:
                futures.append(exe.submit(do_request, url, email, password, shared_session))
            else:
                futures.append(exe.submit(do_request, url, email, password, None))
        for fut in as_completed(futures):
            t, s = fut.result()
            times.append(t)
            statuses.append(s)
    return times, statuses


def summarize(times, statuses):
    times_sorted = sorted(times)
    total = len(times)
    ok = len([s for s in statuses if s and 200 <= s < 400])
    failed = total - ok
    out = {
        'count': total,
        'ok': ok,
        'failed': failed,
        'min': min(times_sorted) if times_sorted else None,
        'max': max(times_sorted) if times_sorted else None,
        'mean': statistics.mean(times_sorted) if times_sorted else None,
        'median': statistics.median(times_sorted) if times_sorted else None,
        'stdev': statistics.stdev(times_sorted) if len(times_sorted) > 1 else 0.0,
        'p90': percentile(times_sorted, 90),
        'p95': percentile(times_sorted, 95),
        'p99': percentile(times_sorted, 99),
    }
    return out


def percentile(sorted_list, p):
    if not sorted_list:
        return None
    k = (len(sorted_list)-1) * (p/100.0)
    f = int(k)
    c = f + 1
    if c >= len(sorted_list):
        return sorted_list[-1]
    d0 = sorted_list[f] * (c - k)
    d1 = sorted_list[c] * (k - f)
    return d0 + d1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True, help='Full URL of the login endpoint, e.g. http://localhost:8000/auth/')
    parser.add_argument('--email', required=True)
    parser.add_argument('--password', required=True)
    parser.add_argument('--requests', '-n', type=int, default=20)
    parser.add_argument('--concurrency', '-c', type=int, default=1)
    parser.add_argument('--use-session', action='store_true', help='Reuse a requests.Session for all requests (can speed up via keep-alive).')
    args = parser.parse_args()

    print(f"Measuring login: url={args.url} requests={args.requests} concurrency={args.concurrency} use_session={args.use_session}")

    if args.concurrency <= 1:
        times, statuses = run_sequential(args.url, args.email, args.password, args.requests, args.use_session)
    else:
        times, statuses = run_concurrent(args.url, args.email, args.password, args.requests, args.concurrency, args.use_session)

    stats = summarize(times, statuses)
    print('\nResults:')
    print(f"Total requests: {stats['count']}")
    print(f"Successful (2xx/3xx): {stats['ok']}, Failed: {stats['failed']}")
    print(f"Min: {stats['min']*1000:.1f} ms")
    print(f"Median: {stats['median']*1000:.1f} ms")
    print(f"Mean: {stats['mean']*1000:.1f} ms")
    print(f"P90: {stats['p90']*1000:.1f} ms")
    print(f"P95: {stats['p95']*1000:.1f} ms")
    print(f"P99: {stats['p99']*1000:.1f} ms")
    print(f"Max: {stats['max']*1000:.1f} ms")
    print(f"Stddev: {stats['stdev']*1000:.1f} ms")


if __name__ == '__main__':
    main()
