import * as utils from "./lib/utils.js";
import * as fido2utils from "./lib/fido2-utils.js";
import env from "/env.js";

let access_token;
let requestId;

registrationForm.onsubmit = async function (e) {
  e.preventDefault();
  access_token = utils.getCookie("access_token");

  return await startRegistration(this);
};

// FIDO2 FLOW START

const startRegistration = async (el) => {
  el.querySelector("button").disabled = true;
  try {
    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");
    headers.append("Authorization", "Bearer " + access_token);
    headers.append("Access-Control-Allow-Origin", env.origin_url);

    const body = new URLSearchParams();
    body.append("appId", env.origin_url);

    const options = {
      method: "POST",
      headers: headers,
      body,
      credentials: "include",
      mode: "cors",
    };
    const response = await fetch(
      `${env.fido_api_url}/start-usernameless-registration`,
      options
    );

    if (!response.ok) {
      throw new Error(await response.json());
    }

    const result = await response.json();
    console.log(
      "FIDO2 start-usernameless-registration response",
      JSON.stringify(result)
    );
    requestId = result.requestId;

    if (requestId) {
      const payload = result.publicKeyCredentialCreationOptions;
      const publicKey =
        fido2utils.decodePublicKeyCredentialCreationOptions(payload);
      const clientKey = await navigator.credentials.create({ publicKey });
      const clientKeyEnc = fido2utils.responseToObject(clientKey);

      const finishPayload = fido2utils.createFinishRegistrationPayload(
        requestId,
        clientKeyEnc
      );

      const stringifiedFinishPayload = JSON.stringify(finishPayload);
      console.log(
        "FIDO2 finish-registration payload",
        stringifiedFinishPayload
      );
      return await finishRegistration(stringifiedFinishPayload);
    } else {
      throw new Error("Il server non ha risposto con un payload valido");
    }
  } catch (error) {
    if (error.message.includes("usable")) {
      console.error(error);
      alert(
        "Hai già registrato una Passkey per questo account su questo dispositivo"
      );
    } else alert(error.message);
  } finally {
    el.querySelector("button").disabled = false;
  }
};

// FIDO2 FLOW END

const finishRegistration = async (body) => {
  try {
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", "Bearer " + access_token);
    headers.append("Access-Control-Allow-Origin", env.origin_url);
    headers.append("Accept", "application/json");

    const options = {
      body,
      headers,
      method: "POST",
      mode: "cors",
      credentials: "include",
    };

    const response = await fetch(
      `${env.fido_api_url}/finish-registration`,
      options
    );
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result = await response.json();
    console.log("FIDO2 finish-registration response", JSON.stringify(result));
    document.location.reload();
  } catch (error) {
    const stringifiedErr = String(error);
    const match = stringifiedErr.match(/"description":"(.*?)["|,}]/);
    if (match) {
      alert(match[1]);
    } else alert(error.message);
  }
};
