import * as utils from "./lib/utils.js";
import env from "/env.js";

const codeInput = document.getElementById("user_code");
const params = new URLSearchParams(document.location.search);
const code_param = params.get("user_code");

if (code_param) {
  codeInput.value = code_param;
  codeSubmit.disabled = false;
}

codeInput.oninput = () => {
  if (codeInput.value.length === 6) {
    codeSubmit.disabled = false;
  } else {
    codeSubmit.disabled = true;
  }
};

codeForm.onsubmit = async (e) => {
  e.preventDefault();
  codeSubmit.disabled = true;
  await checkDevice(codeInput.value);
  codeSubmit.disabled = false;
};

const checkDevice = async (user_code) => {
  try {
    const url = `${env.base_url}/oauth2/device`;

    const headers = new Headers();
    headers.append("Content-Type", "application/x-www-form-urlencoded");
    headers.append("Access-Control-Allow-Origin", env.origin_url);

    const body = new URLSearchParams();
    body.append("user_code", user_code);

    const options = {
      method: "POST",
      headers: headers,
      credentials: "include",
      body,
      mode: "cors",
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(await response.text());
    }

    if (response.redirected) {
      if (response.url.includes("?error=invalid.code")) {
        throw new Error("Codice non valido, riprova.");
      }

      document.location = response.url;
    }
  } catch (error) {
    //handle NET::ERR_CERT_AUTHORITY_INVALID
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
    codeSubmit.disabled = false;
  }
};
