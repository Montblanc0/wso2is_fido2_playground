import * as base64utils from "./base64-utils.js";

export const decodePublicKeyCredentialCreationOptions = (payload) => {
  const excludeCredentials = payload.excludeCredentials.map((credential) => {
    return { ...credential, id: base64utils.Decode(credential.id) };
  });

  return {
    ...payload,
    attestation: "direct",
    challenge: base64utils.Decode(payload.challenge),
    excludeCredentials,
    user: {
      ...payload.user,
      id: base64utils.Decode(payload.user.id),
    },
  };
};

export const responseToObject = (response) => {
  if (response.u2fResponse) {
    return response;
  } else {
    let clientExtensionResults = {};

    try {
      clientExtensionResults = response.getClientExtensionResults();
    } catch (e) {
      console.warn(
        "response.clientExtensionResults non esiste, ma puoi ignorare questo messaggio"
      );
    }

    if (response.response.attestationObject) {
      return {
        clientExtensionResults,
        id: response.id,
        response: {
          attestationObject: base64utils.Encode(
            response.response.attestationObject
          ),
          clientDataJSON: base64utils.Encode(response.response.clientDataJSON),
        },
        type: response.type,
      };
    } else {
      return {
        clientExtensionResults,
        id: response.id,
        response: {
          authenticatorData: base64utils.Encode(
            response.response.authenticatorData
          ),
          clientDataJSON: base64utils.Encode(response.response.clientDataJSON),
          signature: base64utils.Encode(response.response.signature),
          userHandle:
            response.response.userHandle &&
            base64utils.Encode(response.response.userHandle),
        },
        type: response.type,
      };
    }
  }
};

export const createFinishRegistrationPayload = (requestId, credential) => {
  return { requestId, credential };
};
