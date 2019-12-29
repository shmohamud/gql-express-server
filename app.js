const express = require("express");
const graphqlHTTP = require("express-graphql");
const schema = require("./schema/schema");
const bodyParser = require("body-parser");
const cors = require("cors");

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

