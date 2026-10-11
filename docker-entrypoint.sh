#!/bin/sh
set -e
if [ ! -f /app/data/thirty.db ]; then
  echo "No database found — seeding demo workspace..."
  npm run db:reset
fi
exec npm start
