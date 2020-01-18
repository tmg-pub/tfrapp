#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me

#------------------------------------------------------------------------------
# This script handles checking an application if it can be edited and fetching
#                                                the officer comments from it.
def main():
   input = Me.GetRequestBody()
   docid = None
   
   if "editcode" in input:
      # Check their key and load a google doc ID.
      editcode = input["editcode"]
      db, dbc  = Me.ConnectToDatabase()
      docid    = Me.LookupDocid( dbc, editcode )
      dbc.close()
      db.close()
      
      if not docid:
         Me.DebugLog( "Got bad code." )
         Me.Abort()
   else:
      Me.Abort()
   
   request = {
      "function"   : "API_Check",
      "devMode"    : Me.Devmode( input.get("devmode") ),
      "parameters" : [{
         "docid"       : docid,
         "editcode"    : editcode,
         "apps_folder" : Me.config["apps_folder"]
      }],
   }
   
   response = Me.ExecuteAppsScript( request, Me.config["tfr_apps_script"] );
   if not response:
      Me.Abort()
   else:
      if response["response"]["result"]["status"] == "OK":
         Me.Output( response['response']['result'] );
      else:
         Me.Abort()

#------------------------------------------------------------------------------
if __name__ == '__main__': Me.Run( main )
