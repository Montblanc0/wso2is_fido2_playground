import * as utils from "./lib/utils.js";
import env from "/env.js";

const access_token = utils.getCookie("access_token");
let tableWrapper;
let tbody;
(async () => {
  if (!access_token) return; //prevent onload fetching if the user is logged out
  try {
    const headers = new Headers();

    headers.append("Content-Type", "application/x-www-form-urlencoded");
    headers.append("Authorization", "Bearer " + access_token);
    headers.append("Access-Control-Allow-Origin", env.origin_url);
    const options = {
      method: "GET",
      headers: headers,
      credentials: "include",
      mode: "cors",
    };
    const response = await fetch(env.fido_api_url, options);

    if (!response.ok) {
      throw new Error(await response.json());
    }

    const result = await response.json();
    console.log("device metadata response", result);

    if (!result.length) return;

    tableWrapper = document.querySelector(".tableWrapper.hidden");
    tableWrapper.classList.remove("hidden");
    tbody = tableWrapper.querySelector("tbody");

    for (const key of result) {
      createPasskeyEntry(key);
    }
  } catch (error) {
    console.log(error);
  }
})();

const createPasskeyEntry = (key) => {
  const displayName = key.displayName ? key.displayName : "Chiave senza nome";
  const id = key.credential.credentialId;

  const tr = document.createElement("tr");
  const metadataTd = document.createElement("td");
  const controlsTd = document.createElement("td");

  //Prima colonna
  const ul = document.createElement("ul");
  const nameLi = document.createElement("li");
  nameLi.textContent = displayName;
  nameLi.setAttribute("contenteditable", "");
  nameLi.setAttribute("data-key-id", id);
  const idLi = document.createElement("li");
  idLi.classList.add("deviceId");
  idLi.textContent = "id: ";
  const idSpan = document.createElement("span");
  idSpan.textContent = id;

  idLi.appendChild(idSpan);
  ul.appendChild(nameLi);
  ul.appendChild(idLi);
  metadataTd.appendChild(ul);

  // Seconda colonna
  const changeBtn = document.createElement("button");
  changeBtn.classList.add("change");
  const changeIcon = document.createElement("i");
  changeIcon.classList.add("fas", "fa-edit");
  changeBtn.onclick = async function () {
    return await editDisplayName(this, id, displayName);
  };
  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("delete");
  const deleteIcon = document.createElement("i");
  deleteIcon.classList.add("fas", "fa-trash-alt");
  deleteBtn.onclick = async function () {
    return await deletePasskey(this, id);
  };

  changeBtn.appendChild(changeIcon);
  deleteBtn.appendChild(deleteIcon);
  controlsTd.appendChild(changeBtn);
  controlsTd.appendChild(deleteBtn);

  // Appendi al DOM
  tr.appendChild(metadataTd);
  tr.appendChild(controlsTd);
  tbody.appendChild(tr);
};

const deletePasskey = async (el, id) => {
  el.disabled = true;

  try {
    const confirmed = window.confirm("Vuoi davvero eliminare questa Passkey?");

    if (!confirmed) return;
    const headers = new Headers();

    headers.append("Content-Type", "application/json");
    headers.append("Authorization", "Bearer " + access_token);
    headers.append("Access-Control-Allow-Origin", env.origin_url);

    const options = {
      method: "DELETE",
      headers: headers,
      credentials: "include",
      mode: "cors",
    };

    const response = await fetch(`${env.fido_api_url}/${id}`, options);

    if (!response.ok) {
      throw new Error(await response.json());
    }
    document.location.reload();
    return;
  } catch (error) {
    console.log(error);
  } finally {
    el.disabled = false;
  }
};

const editDisplayName = async (el, id, displayName) => {
  el.disabled = true;
  const li = document.querySelector(`li[data-key-id="${id}"]`);
  const name = li.textContent.trim();
  console.log("name to be sent", name);
  try {
    if (displayName === name || name === "Chiave senza nome") {
      console.log("Nulla da modificare");
      return;
    }

    if (!name) {
      alert("Il nome della chiave non può essere vuoto.");
      li.textContent = displayName;
      return;
    }

    const confirmed = window.confirm(`Vuoi cambiare il nome in ${name}?`);

    if (!confirmed) {
      li.textContent = displayName ? displayName : "Chiave senza nome";
      return;
    }
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", "Bearer " + access_token);
    headers.append("Access-Control-Allow-Origin", env.origin_url);

    const body = JSON.stringify([
      {
        operation: "REPLACE",
        path: "/displayName",
        value: name,
      },
    ]);

    const options = {
      method: "PATCH",
      headers: headers,
      credentials: "include",
      mode: "cors",
      body,
    };

    const response = await fetch(`${env.fido_api_url}/${id}`, options);

    if (!response.ok) {
      throw new Error(await response.json());
    }
    document.location.reload();
    return;
  } catch (error) {
    console.log(error);
  } finally {
    el.disabled = false;
  }
};
