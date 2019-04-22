export default {
  db: {
    host: "", // The hostname for your mapd database
    protocol: "http", // http or https
    port: 6278, // The port of the mapd database, default is 6278
    dbName: "[MapD database name]", // The database name
    user: "[MapD database user]", // The database user, minimum permission granted is SELECT
    password: "[MapD database password]" // The database user's password
  }
};
