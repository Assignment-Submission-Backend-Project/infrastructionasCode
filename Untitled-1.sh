#!/bin/bash

url="http://demo.csye6225anirudhv.info/healthz"

# Function to make a single API call
function make_request {
    curl "$url"
    echo "Requested $url"
}

export -f make_request

# Generate a list of 500 numbers and use xargs to run them in parallel
seq 500 | xargs -n 1 -P 500 -I {} bash -c 'make_request'