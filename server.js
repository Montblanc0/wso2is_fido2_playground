const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv").config();
const morgan = require("morgan");
//ENV
const port = process.env.PORT || 5500;
const origin_url = process.env.ORIGIN_URL + ":" + port;
const base_url = process.env.BASE_URL;
const client_id = process.env.CLIENT_ID;

//SERVER
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(morgan("dev"));

const options = {
  key: fs.readFileSync(path.join(__dirname, "cert/server.key")),
  cert: fs.readFileSync(path.join(__dirname, "cert/server.crt")),
};
const server = https.createServer(options, app);

server.listen(port, () => {
  console.log(`App listening on https://localhost:${port}`);
  console.log(`Note: CORS will not work on localhost`);
  console.log(
    `If you have configured your DDNS correctly, you should be able to run the app from ${origin_url}\n`
  );
});

//ROUTES
app.get("/env.js", (req, res) => {
  const envFileContent = `
    const env = {
      origin_url: "${origin_url}",
      isUsePKCE: ${process.env.IS_USE_PKCE},
      base_url: "${base_url}",
      verification_uri_source: "${process.env.VERIFICATION_URI_SOURCE}",
      client_id: "${client_id}",
      basic_auth: "Basic ${btoa(client_id + ":" + process.env.CLIENT_SECRET)}",
      fido_api_url: "${process.env.BASE_URL}/t/${
    process.env.TENANT_DOMAIN
  }/api/users/v2/me/webauthn",
      custom_verification_uri: "${origin_url}/devicecheck"
    };
    export default env;
  `;
  res.set("Content-Type", "application/javascript");
  res.send(envFileContent);
});

app.get("/sessionchecker", (req, res) => {
  res.render("sessionchecker", { client_id, base_url, origin_url });
});

app.get("/account", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "account.html"));
});

app.get(["/", "/index", "/login", "/home"], (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/devicecheck", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "devicecheck.html"));
});

app.get("/callback", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "callback.html"));
});

app.get("/postlogout", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "postlogout.html"));
});
