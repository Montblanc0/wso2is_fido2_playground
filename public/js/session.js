import * as utils from "./lib/utils.js";
import env from "/env.js";

const access_token = utils.getCookie("access_token");
const id_token = utils.getCookie("id_token");

if (id_token) {
  //populate the token hint input value
  logoutForm.elements["id_token_hint"].value = id_token;
  //show username on welcome text
  const subAttribute = utils.getCookie("username");
  sub.textContent = subAttribute;
}

// LOGOUT LOGIC
// controllo scadenza del token (SUPERSEDED by rpIframe)
//// const { exp } = utils.parseJwt(id_token);
//// const currentTime = Math.floor(Date.now() / 1000);
//// (async () => {
////   if (exp <= currentTime) return await logout();
//// })();

// POST logout form
logoutForm.elements["post_logout_redirect_uri"].value =
  env.origin_url + "/postlogout";
logoutForm.action = env.base_url + "/oidc/logout";
logoutForm.querySelector("button[disabled]").disabled = false;
