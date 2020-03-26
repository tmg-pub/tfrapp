## TFRAPP

This is a project to provide a pretty application interface for people to apply to your community (or, more generally, anything that requires application approval and responses).

### Installation Guide

### 1. Upload to the server.
Upload the contents of the app to the server minus any private files (beginning with dots).

Make sure the folders named "private" and "logs" have strict permissions on the server, to prevent anything outside from reading the contents. They include an .htaccess file to deny the web, but there are other things that may creep in there. The logs file can contain private IDs. 

### 2. Configure the application.
private/config.yaml holds most of your configuration.

See config.yaml.example for an example script.

### 3. Install required libraries
On the server:

python3 -m pip install --upgrade google-api-python-client google-auth-httplib2 google-auth-oauthlib
python3 -m pip install --upgrade mysql-connector
python3 -m pip install --upgrade pyyaml

### 4. Deal with hassles
For some inane reason, the year is 2020 and linux fails reading the shebang if line endings are CRLF, though you shouldn't have that problem unless something strange happens as everything is checked in as LF.

Shared hosting may want you to jump through some hoops to install any required packages. I had to install a custom version of python to deploy to Dreamhost's shared servers.

### 5. Create your authorization files.
This part may be a bit painful. The things you need to create are a service account as well as a "web client".

Your project should have a Google "project" attached. Go here to get to the control panel (good link as of 2020).
https://console.developers.google.com/apis/

Under Credentials, create a Service Account key. Don't need to give it any roles, just a name. (I THINK?)

Save the service account key .json file to `private/service_account.json`.

Next, under Credentials, create a OAuth client ID. Type can be WEB, and make sure this is put in the redirect URIs:

https://developers.google.com/oauthplayground

This will allow the OAuth playground to generate keys for you. Save this key to `private/oauth_client.json`.

Follow this link to visit Google's oauth playground. Enter your OAuth client ID and client secret in the configuration box.

https://developers.google.com/oauthplayground/#step1&scopes=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdocuments%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fscript.external_request%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fscript.send_mail&url=https%3A%2F%2F&content_type=application%2Fjson&http_method=GET&useDefaultOauthCred=checked&oauthEndpointSelect=Google&oauthAuthEndpointValue=https%3A%2F%2Faccounts.google.com%2Fo%2Foauth2%2Fv2%2Fauth&oauthTokenEndpointValue=https%3A%2F%2Fwww.googleapis.com%2Foauth2%2Fv4%2Ftoken&includeCredentials=unchecked&accessTokenType=bearer&autoRefreshToken=unchecked&accessType=offline&prompt=consent&response_type=code&wrapLines=on

Press Authorize APIs, and then Exchange authorization code for tokens.

Copy the refresh token generated and put it in `private/client_token.json` which should look like this:

    {
       "refresh": "83u8uh83y5a9p238y5apw8935paw85apw85pwa98"
    }

If there is a `private/client_access.json`, delete it. That's a temporary file generated with a previous refresh token from a previous setup.

The last step here should be made easier in the future with a script to generate the required tokens on a local client.

Files in the private directory for a fresh install should be:
- client_token.json    # the refresh token
- config.yaml          # app configuration
- oauth_client.json    # oauth credentials for your google account
- service_account.json # service account credentials for the project

### For Maintenance
If necessary, can set up a cron job to regularly run maintendance.py. This script prunes out old application entries from the SQL cache, and diagnostic log files.

