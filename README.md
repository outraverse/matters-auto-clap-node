# Auto upvote (clap) articles in Matters.news WEB 3.0 blogging site

This script utilizes Matters' GraphQL API to upvote (clap) the most recent blog of followed authors from a selected account on https://matters.news. 

## Prerequisite 

* NodeJS
* Yarn

Tested against node v16.13.1, yarn 1.22.19

## Installation 

```
# install necessary dependencies from package.json
yarn install
# create .env file
cp sample.env .env
# modify .env to reflect to the correct account info
```

## Run Program

```
node index.js
```

`index.js` will pick up user credentials from .env file.
