const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const graphqlHTTP = require("express-graphql");
const schema = require("./schema/schema");

const app = express();
app.use(cors());
app.use(
  "/graphql",
  bodyParser.json(),
  graphqlHTTP({
    schema: schema,
    graphiql: true
  })
);

module.exports = app

