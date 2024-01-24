#!/bin/bash

# Define endpoint to check
endpoint="http://localhost/"

# Get current timestamp
timestamp=$(date +"%Y-%m-%d %T")

# Check if curl command is available
if ! [ -x "$(command -v curl)" ]; then
    echo "$timestamp - Error: curl is not installed in the container image." >&2
    echo "$timestamp - Please install it and try again." >&2
    exit 1
fi

# Perform health check and redirect output to stdout
output=$(curl --max-time 5 -s -o /dev/null -w "%{http_code}" $endpoint 2>&1)
http_code=$(echo "$output" | tail -n1)
if [[ $http_code == "000" ]]; then
    echo "$timestamp - Error: Connection timed out while trying to reach $endpoint"
    exit 1
fi

# Log output to stdout
echo "$timestamp - Health check $endpoint: HTTP status code $http_code" >&1

# Check if output contains "200"
if [[ $http_code == "200" ]]; then
    exit 0
else
    exit 1
fi
