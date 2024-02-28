import * as utils from "./lib/utils.js";
import env from "/env.js";

// ACCESS TOKEN EXCHANGE

const params = new URLSearchParams(document.location.search);

const code = params.get("code");
utils.setCookie("code", code);
const sessionState = params.get("session_state");
utils.setCookie("session_state", sessionState);
console.log("code:", code);
console.log("session_state:", sessionState);

(async () => {
  const client_id = env.client_id;

  try {
    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");

    const body = new URLSearchParams();
    body.append("grant_type", "authorization_code");
    body.append("code", code);
    body.append("client_id", client_id);
    body.append("redirect_uri", `${env.origin_url}/callback`);
    if (env.isUsePKCE) {
      const verifier = utils.getCookie("verifier");
      console.log("RETRIEVED VERIFIER", verifier);
      body.append("code_verifier", verifier);
    }

    const options = {
      method: "POST",
      headers,
      body,
    };

    const response = await fetch(`${env.base_url}/oauth2/token`, options);

    const result = await response.json();
    console.log(result);

    if (!response.ok) {
      if (result.error_description) {
        message.textContent = result.error_description;
        return;
      } else throw new Error(response);
    }

    if (result.access_token) redirect(JSON.stringify(result));
    else {
      message.textContent = "Risposta priva di access_token";
      throw new Error("Risposta priva di access_token");
    }
  } catch (error) {
    message.textContent = error.message;
  }
})();

const redirect = (result) => {
  const jwt = utils.parseJwt(result);
  console.log("id_token jwt", jwt);

  const { access_token, id_token, refresh_token, expires_in } =
    JSON.parse(result);

  utils.setCookie("access_token", access_token, expires_in);
  utils.setCookie("refresh_token", refresh_token, expires_in);
  utils.setCookie("id_token", id_token, expires_in);
  utils.setCookie("username", jwt.sub.split("@")[0], expires_in);

  document.location = `${env.origin_url}/account`;
};
