#!/bin/sh

cd sites/gelr.es && ../../vendor/bin/drush core-cron --quiet > /dev/null 2>&1
