# TFRAPP by Potter-MoonGuard (c) 2020
# 
# This contains a lot of common code shared by the other scripts, imported as
#  "Me".
#//////////////////////////////////////////////////////////////////////////////
import google.oauth2.credentials
import google.auth.transport.requests
from googleapiclient.discovery import build
from google.oauth2 import service_account
from googleapiclient import errors
import json
from datetime import datetime
import os, sys
import mysql.connector
import traceback
import yaml

#------------------------------------------------------------------------------
with open( "private/config.yaml", "rb" ) as fp:
   config = yaml.full_load( fp )

devmode = os.path.exists( ".devmode" )
output = [];

#------------------------------------------------------------------------------
# Abort the script and respond with HTTP 500. We can be lazy because this isn't
#  a public API. Just use this error message for everything, including invalid
#  input.
def Abort():
   print( "Status: 500 Internal Server Error\n" )
   sys.exit( 0 )

#------------------------------------------------------------------------------
# Returns true if the password matches our devmode password, or if the bypass
#                          file is present (.devmode) in the working directory.
def Devmode( password ):
   return devmode or password == Me.config.get("devmode_password")
   
#------------------------------------------------------------------------------
# Output data to the client. This is buffered to allow printing of the HTTP
#  headers first. Everything is output at once when `Run` finishes.
# Non-string input will be converted using json.dumps.
def Output( data ):
   if type( data ) != "string":
      data = json.dumps( data );
   output.append( data );
   
#------------------------------------------------------------------------------
# Use this to read json input from stdin. POST requests feed the script through
#  stdin. Not doing it this way may result in corruption due to the utf-8
#  input not being handled right.
def GetRequestBody():
   stdin_data = sys.stdin.buffer.read()
   return json.loads( stdin_data.decode("utf8" ))
   
#------------------------------------------------------------------------------
# Load JSON from the file given. By default errors are ignored and None is
#  returned (good for when a file may not exist yet and needs to be generated,
#                                                      like the access token).
def LoadJSON( filepath, errors = False ):
   try:
      with open( filepath, "r" ) as file:
         return json.load( file )
   except FileNotFoundError:
      if errors: raise
      return None
      
#------------------------------------------------------------------------------
# Load a basic text file.
def LoadFile( filepath ):
   try:
      with open( filepath, "r" ) as file:
         return file.read();
   except FileNotFoundError:
      return None;
      
#------------------------------------------------------------------------------
# Save a dict to a file.
def SaveJSON( filepath, data ):
   with open( filepath, "w" ) as file:
      json.dump( data, file )
      
#------------------------------------------------------------------------------
# Save a string to a text file.
def SaveFile( filepath, contents ):
   with open( filepath, "w" ) as file:
      file.write( contents )

#------------------------------------------------------------------------------      
# Connects to the mysql database described in config.yaml, and returns a mysql
#  instance as well as a cursor.
# Dont forget to db.commit() after you make changes, otherwise they will be
#  ignored/rolled back.
# The mysql object is kept alive in here as a global object.
mysql_db = None
def ConnectToDatabase():
   global mysql_db
   mysql_db = mysql.connector.connect(
      host     = config["sql"]["host"],
      user     = config["sql"]["user"],
      passwd   = config["sql"]["password"],
      database = config["sql"]["database"]
   )
   return mysql_db, mysql_db.cursor()
   
#------------------------------------------------------------------------------
# Helper function to fetch a document ID from an editcode, using an active
#                                                      database connection.
def LookupDocid( dbc, editcode ):
   dbc.execute( "SELECT docid FROM Apps WHERE editcode=%(editcode)s", 
                {"editcode": bytearray.fromhex(editcode)} )
   result = dbc.fetchone()
   if result: return result[0]
   
   # Not found.
   return None
   
#------------------------------------------------------------------------------
# Execute a Google Apps script. This handles all of the setup of getting
#  credentials from an access token and such. Proper credentials should be
#      given in the private files - described in the installation instructions.
def ExecuteAppsScript( request, script_id ):
   gscripts = GetGoogleScriptsService()
   try:
      response = gscripts.scripts().run(
         body     = request,
         scriptId = script_id
      ).execute()
      
      if 'error' in response:
         # The API executed, but the script returned an error.

         # Extract the first (and only) set of error details. The values of
         # this object are the script's 'errorMessage' and 'errorType', and
         # an list of stack trace elements.
         with open( LogFilePath( "errors" ), "a" ) as f:
            error = response['error']['details'][0]
            LogError( "Script error message: {0}".format(error['errorMessage']) )

            if 'scriptStackTraceElements' in error:
               # There may not be a stacktrace if the script didn't start
               # executing.
               LogError( "Script error stacktrace:" )
               for trace in error['scriptStackTraceElements']:
                  LogError( "\t{0}: {1}".format(trace['function'],
                     trace['lineNumber']) )
         response = None;
   except errors.HttpError as e:
      # The API encountered a problem before the script started executing.
      LogError( "HTTP Error" )
      LogError( e.content )
      response = None
   return response
      
#------------------------------------------------------------------------------
# Refresh access token if it is expired or invalid.
def RefreshAccessToken( creds ):
   requests = google.auth.transport.requests.Request()
   
   # NOTE that the google API subtracts 5 minutes from the expiry time to avoid
   #  us doing that ourselves. They recommend in the docs to do that because
   #  otherwise a script may terminate unexpectedly if the access token expires
   #                                                          during execution.
   if not creds.valid or creds.expired:
      creds.refresh( requests )
      SaveJSON( "private/client_access.json", {
         "access_token": creds.token,
         "expiry": creds.expiry.timestamp()
      })
      return

#------------------------------------------------------------------------------
# Read the authentication files and then create a Credentials instance. It's
#                                           refreshed in here too if need be.
creds = None
def GetGoogleCredentials():
   global creds
   if creds: return creds
   oauth_info    = LoadJSON( "private/oauth_client.json"  )
   client_token  = LoadJSON( "private/client_token.json"  )
   client_access = LoadJSON( "private/client_access.json" )
   
   creds = google.oauth2.credentials.Credentials(
      client_access["access_token"] if client_access else None,
      refresh_token = client_token["refresh"],
      token_uri = oauth_info["web"]["token_uri"],
      client_id = oauth_info["web"]["client_id"],
      client_secret = oauth_info["web"]["client_secret"] )
      
   if creds.valid:
      creds.expiry = datetime.fromtimestamp(client_access["expiry"])
      
   RefreshAccessToken( creds )
   return creds
   
#------------------------------------------------------------------------------
# Build a "script" service from the Google API client. The instance will be
#                                         cached for the rest of the script.
gscripts = None
def GetGoogleScriptsService():
   global gscripts
   if gscripts: return gscripts
   return build( 'script', 'v1', credentials = GetGoogleCredentials() )

#------------------------------------------------------------------------------
# Build a "script" service from the Google API client. The instance will be
#  cached for the rest of the script. This also uses a service account, and not
#                                                        a normal oauth client.
gdocs = None
def GetGoogleDocsService():
   global gdocs
   if gdocs: return gdocs
   
   # Just populate this with any scopes that the entire application needs.
   SCOPES = ['https://www.googleapis.com/auth/documents.readonly']
   
   creds = service_account.Credentials.from_service_account_file(
                              'private/service_account.json', scopes = SCOPES )
   gdocs = build( 'docs', 'v1', credentials = creds )
   return gdocs

#------------------------------------------------------------------------------
# Build a filepath to a log file. This splits up log files by day. Old files
#              should have a way to be pruned (setup a maintenance cron job).
def LogFilePath( prefix ):
   return "logs/%s-%s.log" % (prefix, datetime.now().strftime('%Y-%m-%d'))
   
#------------------------------------------------------------------------------
# Log data to the debug log, if devmode is enabled.
debugfile = None
def DebugLog( *args ):
   if not devmode: return
   global debugfile
   if not debugfile:
      now = datetime.now()
      debugfile = open( LogFilePath("debug"), 'a' )
      print( "-- %s - %s --" % (sys.argv[0], now.strftime('%Y-%m-%d  %H:%M:%S')), file = debugfile )
   print( *args, file = debugfile )
   
#------------------------------------------------------------------------------
# Log data to an error file. This is done by certain wrappers to save any
#                                       errors that happen on the server.
errorfile = None
def LogError( *args ):
   global errorfile
   now = datetime.now()
   if not errorfile:
      errorfile = open( LogFilePath("errors"), 'a' )
      print( "-- %s - %s --" % (sys.argv[0], now.strftime('%Y-%m-%d  %H:%M:%S')), file = errorfile )
   print( now.strftime('[%Y-%m-%d %H:%M:%S]'), *args, file = errorfile )
   
#------------------------------------------------------------------------------
# Main wrapper for executable scripts. Handles outputting the HTTP header and
#  output.
def Run( entry, *args ):
   try:
      entry( *args )
      print( "Status: 200 OK\n"
             "Content-Type: application/json;charset=utf-8\n" )
      
      # Todo: need to make sure that the output encoding is done right.
      print( "\n".join( output ) )
      
   except Exception as e:
      LogError( "Script encountered error!" )
      traceback.print_exc( file = errorfile )
      print( "", file = errorfile )
      Abort()

# A nice small name.
Put = Output
