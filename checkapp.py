#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me

#------------------------------------------------------------------------------
# This script is run when the user loads the application page with an existing
#  application found in their cache. It fetches information from the server
#  about their application status and comments and if it is still open to being
#  edited.
def main():
   input = Me.GetRequestBody()
   docid = None
   
   if "editcode" in input:
      Me.Log( "Checking app with editcode.", input["editcode"] )
      # 'editcodes' are strings that are mapped to google document IDs and used
      #  to verify that a user has authorization to edit a file.
      
      # Check their key and load a google doc ID from the database.
      editcode = input["editcode"]
      db, dbc  = Me.ConnectToDatabase()
      docid    = Me.LookupDocid( dbc, editcode )
      dbc.close()
      db.close()
      
      if not docid:
         Me.Log( "Couldn't locate document. Aborting." )
         Me.Abort()
   else:
      # All requests need an editcode. If it's not there, the user is likely up
      #  to no good.
      Me.Log( "Got request without editcode." )
      Me.Abort()
   
   # Running API_Check on the GAS side.
   request = {
      "function"   : "API_Check",
      "devMode"    : Me.Devmode(),
      "parameters" : [{
         "docid"       : docid,
         "editcode"    : editcode,
         "apps_folder" : Me.config["apps_folder"]
      }],
   }
   
   response = Me.ExecuteAppsScript( request, Me.config["tfr_apps_script"] );
   if not response:
      # Something failed during execution. It has been logged and the user
      #  will see an error message.
      Me.Abort()
   else:
      # Forward response to user.
      if response["response"]["result"]["status"] == "OK":
         Me.Output( response['response']['result'] );
      else:
         Me.Abort()

#------------------------------------------------------------------------------
if __name__ == '__main__': Me.Run( main )
