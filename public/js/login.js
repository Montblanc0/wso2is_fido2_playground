import * as utils from "./lib/utils.js";
import env from "/env.js";

// AUTHORIZATION ENDPOINT

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  await login();
};

const login = async () => {
  const authUrl = `${env.base_url}/oauth2/authorize`;
  const scope = "openid internal_login";
  const redirectUri = `${env.origin_url}/callback`;
  const responseType = "code";

  let url = `${authUrl}?client_id=${env.client_id}&scope=${encodeURIComponent(
    scope
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=${responseType}`;

  if (env.isUsePKCE) {
    const verifier = utils.generateCodeVerifier();
    console.log("VERIFIER", verifier);
    utils.setCookie("verifier", verifier);
    const challenge = await utils.generateCodeChallengeFromVerifier(verifier);
    const challenge_method = "S256";
    url = `${url}&code_challenge=${challenge}&code_challenge_method=${challenge_method}`;
  }

  document.location = url;
};
