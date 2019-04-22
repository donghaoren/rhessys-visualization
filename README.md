# RHESSys Visualizations

## Building and running on localhost

First install dependencies:

```sh
yarn install
```

Then, write the config file:

```sh
cp config.template.js config.js
# Enter the required database info in config.js
```

To run in hot module reloading mode:

```sh
yarn start
```

To create a production build:

```sh
yarn run build-prod
```

## Running

```sh
yarn start
```

Point your browser to <http://localhost:1234>