# WSO2 IS FIDO2 Playground

A passkey manager for WSO2 IS v6.0.0+ featuring OAuth 2.0 and QR Code login for both same-site and cross-device biometric authentication.

This web application aim is to mimic WSO2's MyAccount Security Key/Biometrics management by implementing [WSO2 IS FIDO RESTful API](https://is.docs.wso2.com/en/6.0.0/apis/fido-rest-api/).

<p align="center"><img src="https://i.ibb.co/DMfkK8T/passkeylogin.jpg" alt="passkeylogin" border="0" width="300">&nbsp;
<img src="https://i.ibb.co/98WP3G6/Whats-App-Image-2024-02-26-at-22-06-30.jpg" alt="Whats-App-Image-2024-02-26-at-22-06-30" border="0" width="300"></p>

All FIDO2 CRUDs have been implemented and can be used after logging in with an account already registered on WSO2 IS.

It also features a custom device code verification endpoint (QR code login) with a centralized logic to choose between default/custom verification uri.

## Disclaimer

This webapp is **highly experimental** and does not follow any best development practice. It was made for a quick demo to show an implementation of WSO2 IS FIDO RESTful API that "just works".

It was later expanded to experiment with OAuth 2.0 session management and device grant flow.

Session management is only implemented for regular OAuth 2.0 same-device sessions and might not work as expected.

Usage of this code in professional enviroments is highly discouraged.

# Prerequisites

- [**WSO2 IS 6.0.0 or later**](https://wso2.com/identity-server/) (either a remote or local installation)

  - An account already registered on WSO2 IS (use admin or register a new account)

- A **dynamic DNS hostname** linked to your local IP address. You're going to use this domain instead of `localhost`. You can follow [this guide](https://mifrazmurthaja.medium.com/testing-wso2-identity-server-fido-using-mobile-fingerprint-668692fdeecd#b1fc) if you don't already own one
  - If your WSO2 IS is installed on the same machine (or Docker/VirtualBox with port forwarding) follow [Changing the hostname on WSO2 IS](https://mifrazmurthaja.medium.com/testing-wso2-identity-server-fido-using-mobile-fingerprint-668692fdeecd#f4f9) from the same guide as well
- **Bluetooth** enabled on your machine
- [**npm**](https://nodejs.org/en/download/)
- **openssl**
  - **Ubuntu / WSL**
    run `sudo apt update && sudo apt install openssl`
  - **macOS** should already ship with a built-in openssl
  - **Windows** is a bit tricky (WSL is recommended), but you can search for a guide online such as [this one](https://dotroll.com/en/knowledge-base/books/certificates/page/how-to-generate-a-private-key-and-csr-on-the-microsoft-windows-system)
- [**Firefox**](https://www.mozilla.org/firefox/) is highly recommended as it is currently the only tested desktop browser that does not prevent WebAuthn from working in unsafe environments (tested on 123.0)
- A **modern smarphone** with working Bluetooth and Camera and **Firefox** installed to enroll your device with a fingerprint and to test cross-device authentication

# Setup

## WSO2 IS deployment configuration

The following configuration requires adding/editing some properties in your deployment configuration file, usually found in `<IS_HOME>/repository/conf/deployment.toml`

### FIDO2 setup

Add your DDNS hostname with the port you wish this app to be listening on to the `origins` array in the `[fido.trusted]` group.

Example configuration (replace `myhost.ddns.net` with your hostname and `5500` with the desired port):

```toml
[fido.trusted]
origins = [
"https://myhost.ddns.net:5500"
]
```

### CORS configuration

- Add your _DDNS domain_ and _port_ to the `allowed_origins` array
- Add all main methods to `supported_methods`

Example configuration (replace `myhost.ddns.net` with your hostname and `5500` with the port you wish this app to be listening on):

```toml
[cors]
allow_generic_http_requests = true
allow_any_origin = false
allowed_origins = [
"https://myhost.ddns.net:5500"
]
allow_subdomains = false
supported_methods = [
    "GET",
    "POST",
    "HEAD",
    "OPTIONS",
    "PATCH",
    "DELETE"
]
support_any_header = true
supported_headers = []
exposed_headers = []
supports_credentials = true
max_age = 3600
tag_requests = false
```

### Device code configuration

- Edit/add the following properties:

```toml
[oauth.grant_type.device_code]
key_length = 6
expiry_time = "1m"
polling_interval = "5s"
key_set = "BCDFGHJKLMNPQRSTVWXYZbcdfghjklmnpqrstvwxyz23456789"
```

Feel free to change the `key_set` to your likings, but keep other properties unchanged.

## Create a Service Provider on WSO2 IS

Log into your carbon console and add a new Service Provider from **Main > Service Providers > Add**

Choose any name and make sure to check **Management Application** (this is mandatory in order to issue the _internal_login_ scope which is required by the FIDO2 API)

<p align="center"><img src="https://i.ibb.co/vZFcLzZ/01.jpg" alt="01" border="0" width="600"></p>

Expand **Inbound Authentication Configuration > OAuth/OpenID Connect Configuration > Configure**

- **OAuth Version** -> select 2.0
- **Allowed Grant Types** -> check Code and urn:ietf:params:oauth:grant-type:device_code
- **Callback Url** -> you will have to build a regex with your DDNS domain and the port you chose this app to run on.

E.g. if your domain is **myhost.ddns.net** and you chose port **5500**, the regex should look like this:

`regexp=https:\/\/myhost\.ddns\.net:5500(?:\/(?:index|account|callback|postlogout))?`

> Make sure to escape the forward slashes `/` and dots `.` with a backslash `\` as shown in the example above.

- **PKCE Mandatory** -> This webapp supports PKCE, but you can choose whether to enforce it or not. If you check this box, you won't be able to login unless IS_USE_PKCE is set to true (see [Environment setup](#environment-setup))

- Check **Support PKCE 'Plain' Transform Algorithm**
- Check **Allow authentication without the client secret**

<p align="center"><img src="https://i.ibb.co/FxNn1qB/02.jpg" alt="02" border="0" width="600"></p>

- **Access Token Binding Type** -> select **Cookie Based**
- Check **Validate token bindings**
- Check **Revoke tokens upon user logout**

<p align="center"><img src="https://i.ibb.co/PZvNFQm/03.jpg" alt="03" border="0" width="600"></p>

When finished, click the **Add** button below.

If you expand **Inbound Authentication Configuration > OAuth/OpenID Connect Configuration** again, you will see an entry with an **OAuth Client Key** and **OAuth Client Secret**. _Take note of these values_ as you will have to enter both in this app's [environment configuration](#environment-setup).

Now back to the service provider configuration page and expand **Local & Outbound Authentication Configuration** and click on the **Advanced Configuration** selectable option. This will bring you to a page where you can configure your authenticators.

For this app's purposes I chose a single-step, MMA (multi-modal authentication) where users can either login via credentials or biometrics (Passkey).

<p align="center"><img src="https://i.ibb.co/WzPynhH/04.jpg" alt="04" border="0" width="600"></p>

Be sure to check **Use subject identifier from this step** and **Use attributes from this step** on the step that should provide the app with information about the user.

> If you plan on testing a 2FA / MFA solution, just **add more steps** and configure them as you see fit (e.g. Username & Password in Step 1 and Security Key/Biometrics in Step 2).

> **BEWARE**: using Security Key/Biometrics as a mandatory factor will require you to have at least 1 Passkey enrolled for that account, otherwise you won't be able to login. If this is the first time experimenting with MFA on WSO2 IS, go for the first option (single step with Username & Password + Biometrics) so that you can login to your account via username and password and create a Passkey from this application.

Click on **Update** and go back to the **Local & Outbound Authentication Configuration** tab.

- Check **Skip Login Consent**
- Check **Skip Logout Consent**
- Check **Use tenant domain in local subject identifier**
- Check **Use user store domain in local subject identifier**
- Check **Use user store domain in roles**

<p align="center"><img src="https://i.ibb.co/VNPyFPy/05.jpg" alt="05" border="0" width="600"></p>

Once finished, click the **Update** button at the end of the page and it should get you back to the Service Providers list.

## Application setup

Clone this repository (or download sources from [Releases](https://github.com/Montblanc0/wso2is_fido2_playground/releases) and open a terminal from (or `cd` into) the app directory. The following commands will assume you're typing **from the app root folder**.

### Install dependencies

Run `npm install` from the terminal and let it finish.

### Create a certificate

#### Windows and Mac

`cd` into the `cert` folder and run the following commands:

1. Generate a private key

```bash
openssl genrsa -out server.key 2048
```

2. Generate a certificate signing request (user input)

```bash
openssl req -new -sha256 -key server.key -out server.csr
```

You can fill the requested fields or you could just **leave everything blank** (spam the Enter key), e.g.:

```bash
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.

---

Country Name (2 letter code) [AU]:
State or Province Name (full name) [Some-State]:
Locality Name (eg, city) []:
Organization Name (eg, company) [Internet Widgits Pty Ltd]:
Organizational Unit Name (eg, section) []:
Common Name (e.g. server FQDN or YOUR name) []:
Email Address []:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
writing RSA key
Certificate request self-signature ok
subject=C = AU, ST = Some-State, O = Internet Widgits Pty Ltd
```

3. Remove passphrase from key

```bash
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key
```

4. Generate a self-signed certificate

```bash
openssl x509 -req -days 999999 -in server.csr -signkey server.key -out server.crt
```

#### Ubuntu / WSL

You can follow the [steps above](#windows-and-mac) or just run the provided **automated script**. If you choose the latter, run the following commands from the app root:

```shell
$ chmod +x cert/gen_cert.sh
$ cert/gen_cert.sh
```

You will still be prompted for some information, but you can just keep everything blank.

## Environment setup

Open the `.env` file in the app root and set the following properties:

1. **PORT** -> the port this app should be listening on (default is 5500)
2. **ORIGIN_URL** -> your DDNS domain prefixed by `https://`
3. **BASE_URL** -> this is your fully qualified carbon url (includes `https://` and `:PORT`). If WSO2 IS is installed on your machine, or VirtualBox/Docker with port forwarding (e.g. you can access carbon via localhost), use the same hostname you used for the ORIGIN_URL
4. **TENANT_DOMAIN** -> default is `carbon.super`, you don't need to change this unless you know what you're doing

5. **CLIENT_ID** -> This is the OAuth Client Key you got from your Service Provider's OAuth Configuration
6. **CLIENT_SECRET** -> This is the OAuth Client Secret you got from your Service Provider's OAuth Configuration
7. **IS_USE_PKCE** -> can either be `true` or `false`. Leave it to true to send a PKCE Code Challenge when authenticating
8. **VERIFICATION_URI_SOURCE** -> can either be `DEFAULT` or `CUSTOM`. Leave it to CUSTOM to use this app's endpoint for verifying the user code (QR code login). Change it to DEFAULT to use WSO2 IS's default endpoint

Below is an example configuration that considers both this app and WSO2 IS running on the same machine with a DDNS hostname named "myhost.ddns.net":

```lua
PORT=5500
ORIGIN_URL=https://myhost.ddns.net
BASE_URL=https://myhost.ddns.net:9443
TENANT_DOMAIN=carbon.super
CLIENT_ID=YOUR_CLIENT_KEY
CLIENT_SECRET=YOUR_CLIENT_SECRET
IS_USE_PKCE=true
VERIFICATION_URI_SOURCE=CUSTOM
```

# Run the application

- **Make sure WSO2 IS is up and running**.

> **Please note:** WSO2 IS should be accessed via **https and a full domain name** (no IPs and no localhost). If your WSO2 IS is hosted locally, check the [Prerequisites section](#prerequisites) for a link to a guide that will help you change the internal hostname.

- Open a terminal into the app root folder and run:

```bash
npm start
```

Your default browser will open a tab to `ORIGIN_URL:PORT`.

The first time, your browser will warn you of potential risks. This is expected as we are dealing with self-signed certificates. You should **accept the risks and continue**.

Finally, you should be welcomed by the login page.

<p align="center"><img src="https://i.ibb.co/PtGK7z7/Schermata-2024-02-27-alle-15-42-12.jpg" alt="Login page" border="0" width="300"></p>

## QR Code Login

By choosing to login via QR code you will have the option to scan the QR Code with your device or to visit a link to manually enter the code.

<p align="center"><img src="https://i.ibb.co/p3VmR0F/Screenshot-2024-02-27-230257.jpg" alt="QR code" border="0" width="600"></p>

This link will be internal if VERIFICATION_URI_SOURCE is CUSTOM, or it will be the default one if set to DEFAULT.

## Passkey Management

Once logged in you should get redirected to the `/accounts` page.

- Create a new Passkey with the **Crea una Passkey** button. This will trigger your system to show a prompt to enroll a device;

> **TIP**: Any operating system will have its own way of managing Passkeys. Feel free to experiment with cross-device authentication by choosing to authenticate with another device. You should enable Bluetooth on both ends and scan the QR code to enroll your smartphone as a roaming authenticator.

> **TIP**: You can also visit `<ORIGIN_URL>:<PORT>` directly from a smartphone connected to the same network to enroll the device with a fingerprint. Then login on the same device via biometrics or login from your desktop browser and choose your smartphone to authenticate.

> **BEWARE**: An account can have as many Passkeys as you want on a domain, but _you can't enroll the same device twice on the same account_.

- Once landed on the `/account` page, it will automatically fetch all of your Passkeys and show them in a table;

- You can change the name of a Passkey by writing directly into the related text box (Passkey names are treated as input fields). Confirm the action with the **Edit** button

- You can delete a Passkey with the **Trashcan** button

## Troubleshooting

> The app is not loading at startup

- Make sure your DDNS domain is set up correctly on your machine
- Double check the `.env` file for any typos in the ORIGIN_URL
- Delete the app and [setup the application](#application-setup) once again

> "Unable to fetch" errors and 404 pages

- Make sure WSO2 IS is up and running
- Clear the browser's cache
- Test the carbon URL to make sure the URL is accessible from your machine
- If you have followed [Changing the hostname on WSO2 IS](https://mifrazmurthaja.medium.com/testing-wso2-identity-server-fido-using-mobile-fingerprint-668692fdeecd#f4f9) you have likely installed a self-signed certificate on that end as well. Visit the carbon URL and accept any risks, then go back to the application

> "An attempt was made to use an object that is not, or is no longer, usable"

You already have a Passkey for the logged in account on the same device.

> "WebAuthn is not supported on sites with TLS certificate errors."

Use Firefox
