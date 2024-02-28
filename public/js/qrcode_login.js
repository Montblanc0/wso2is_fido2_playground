import * as utils from "./lib/utils.js";
import env from "/env.js";

const qrWrapper = document.querySelector(".qrWrapper");
const formWrapper = document.querySelector(".formWrapper");
const header = document.querySelector(".wrapper h3:first-child");
const canvas = document.getElementById("qr_code");
const code = document.querySelector("code");

let pollingInterval;
let pollingTimeout;

const qr = new QRious({
  element: canvas,
  background: "white",
  backgroundAlpha: 0,
  foreground: "#111",
  foregroundAlpha: 1,
  level: "H",
  padding: null,
  size: 200,
});

qrForm.onsubmit = async (e) => {
  e.preventDefault();

  const data = await getDeviceAuth();
  if (!data) return;
  generateQRCode(data);

  header.classList.add("no-display");
  formWrapper.classList.add("no-display");
  qrWrapper.classList.remove("no-display");
};

regen.onclick = async () => {
  regen.disabled = true;

  const data = await getDeviceAuth();
  generateQRCode(data);

  regen.disabled = false;
};

const generateQRCode = async (payload) => {
  console.log("device_authorize response", payload);

  clearInterval(pollingInterval);
  clearTimeout(pollingTimeout);

  qr.value = payload.verification_uri_complete;
  verification_link.href = payload.verification_uri;
  verification_link.textContent = payload.verification_uri;
  code.textContent = payload.user_code;

  document
    .querySelectorAll(".qrWrapper *")
    .forEach((el) => el.classList.remove("no-display"));
  document.getElementById("exp-text").classList.add("no-display");
  document.getElementById("regen").classList.add("small-btn");

  pollingInterval = setInterval(
    () => pollForToken(payload.device_code),
    (payload.interval + 0.5) * 1000
  );
  pollingTimeout = setTimeout(() => {
    clearInterval(pollingInterval);
    document
      .querySelectorAll(".qrWrapper :not(#regen)")
      .forEach((el) => el.classList.add("no-display"));
    document.getElementById("exp-text").classList.remove("no-display");
    document.getElementById("regen").classList.remove("small-btn");
  }, 60000);
};

const getDeviceAuth = async () => {
  try {
    const url = `${env.base_url}/oauth2/device_authorize`;

    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");
    headers.append("Access-Control-Allow-Origin", env.origin_url);

    const body = new URLSearchParams();
    body.append("client_id", env.client_id);
    body.append("scope", "openid internal_login");

    const options = {
      method: "POST",
      headers: headers,
      body,
      mode: "cors",
    };
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(await response.json());
    }

    const result = await response.json();
    console.log("device_authorize response", JSON.stringify(result));

    if (!result.user_code) {
      throw new Error("Il server non ha risposto con un payload valido");
    }

    // LOGICA DI INDIVIDUAZIONE DEL SERVICE PROVIDER

    // 1. Manipola gli uri della response
    if (env.verification_uri_source !== "DEFAULT") {
      result.verification_uri = env.custom_verification_uri;
      result.verification_uri_complete = `${env.custom_verification_uri}?user_code=${result.user_code}`;
    }

    return result;

    // 2. Aggiunge le proprietà senza modificare
    // const customResponse = {
    //   custom_verification_uri: env.custom_verification_uri,
    //   custom_verification_uri_complete: `${env.custom_verification_uri}?user_code=${result.user_code}`,
    //   ...data,
    // };

    // return customResponse;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.log(error);
      alert(
        "Errore nel recupero della risorsa. Possibili cause:\n" +
          "1. WSO2IS non risponde (è up?)\n" +
          "2. Stai provando ad accedere da localhost (assicurati di usare il dominio)\n" +
          "3. Potresti non aver ancora accettato i rischi di un certificato self-signed.\n\n" +
          "Sarai indirizzato a " +
          env.base_url +
          " per accettarli o verificare che l'endpoint risponda.\n\n" +
          " Una volta fatto, torna qui e riprova."
      );
      document.location = env.base_url;
    } else alert(error.message);
  }
};

const pollForToken = async (device_code) => {
  (async () => {
    const client_id = env.client_id;

    try {
      const headers = new Headers();
      headers.append("Content-Type", "application/x-www-form-urlencoded");

      const body = new URLSearchParams();
      body.append("grant_type", "urn:ietf:params:oauth:grant-type:device_code");
      body.append("device_code", device_code);
      body.append("client_id", client_id);
      body.append("redirect_uri", `${env.origin_url}/callback`);

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
          console.log("TOKEN POLLING", result.error_description);
          return;
        } else throw new Error(response);
      }

      if (result.access_token) {
        clearInterval(pollingInterval);
        clearTimeout(pollingTimeout);
        redirect(JSON.stringify(result));
      } else {
        message.textContent = "Risposta priva di access_token";
        throw new Error("Risposta priva di access_token");
      }
    } catch (error) {
      clearInterval(pollingInterval);
      clearTimeout(pollingTimeout);
      alert(error.message);
    }
  })();
};

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
