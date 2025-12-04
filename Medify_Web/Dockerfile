FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# system deps for many python packages
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# copy and install python deps
COPY Medify_Web/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy project
COPY . /app

WORKDIR /app/Medify_Web

# static files location
ENV STATIC_ROOT=/vol/static
RUN mkdir -p /vol/static

EXPOSE 8000

ENTRYPOINT ["/app/Medify_Web/entrypoint.sh"]
