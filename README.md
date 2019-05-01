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

To run:

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

## Setup the MapD database

You'll need to have a MapD server running. Here is the [docker](https://www.docker.com/) approach:

```sh
docker run -d \
    -v /path/to/your/omnisci-docker-storage:/omnisci-storage \
    -p 6273-6280:6273-6280 \
    omnisci/core-os-cpu
```

## Import data into MapD

Use the following python code to import data:

```bash
# Required python packages
pip install pymapd
pip install pandas
```

```python
from rhessys_import import prepare_table_for_mapd
from pymapd import connect

table_name = "base_basin"

df = prepare_table_for_mapd([
    "data/base_basin.daily",
    "data/base_grow_basin.daily"
], delim_whitespace=True)

# See if the dataframe is loaded correctly
df.head()

# Connect to the MapD server
con = connect(
    user="mapd", # Fill in your MapD user/password
    password="HyperInteractive",
    host="localhost",
    dbname="mapd"
)

# Load the dataframe into a mapd table (remove existing table if any)
con.execute("DROP TABLE IF EXISTS " + table_name)
con.load_table(table_name, df, create=True)
```
