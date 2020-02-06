#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me
import json

#------------------------------------------------------------------------------
# API for users to submit applications.
# Request is in the format:
# {
#    devmode: Optional devmode password.
#    editcode: If given, we will try to edit an existing application rather
#              than creating a new one.
#    parts: Parts of the application. Includes both prompts and answers.
# }
def main():
   input = Me.GetRequestBody()
   
   db, dbc  = Me.ConnectToDatabase()
   docid    = None
   editcode = None
   
   if "editcode" in input:
      # Check their key and load a document ID.
      editcode = input["editcode"]
      docid = Me.LookupDocid( dbc, editcode )
      if not docid:
         # That editcode isn't registered.
         # In the future, we should block people from testing too many
         #  editcodes.
         Me.Abort()
   
   newdoc = False
   if not docid:
      newdoc   = True
      editcode = Me.MakeEditcode()
   
   script_arg = {
      "editcode"    : editcode,
      "apps_folder" : Me.config["apps_folder"],
      "discord"     : Me.config["discord_webhooks"],
      "app"         : {
         "parts": input["parts"]
      },
   }
   # If this is set, then an existing document will be updated,
   # otherwise, a new document will be created.
   if docid: script_arg["docid"] = docid
   
   response = Me.ExecuteAppsScript(
      {
         "function"   : "API_SubmitApplication",
         "devMode"    : Me.Devmode( input.get("devmode") ),
         "parameters" : [ script_arg ]
      },
      Me.config["tfr_apps_script"]
   );
   
   if not response:
      Me.Abort()
   else:
      if response["response"]["result"]["status"] == "OK":
         
         # Save a record in our database of everything so that the user can
         #  easily access it through the editcode.
         dbc.execute(
            "INSERT INTO Apps (editcode, docid, updated, content) "
            "VALUES (%(editcode)s, %(docid)s, %(updated)s, %(content)s ) "
            "ON DUPLICATE KEY UPDATE updated=%(updated)s, content=%(content)s",
            {
               "editcode": editcode,
               "docid": response["response"]["result"]["docid"],
               "updated": Me.now,
               "content": json.dumps( input["parts"] )
            }
         )
         db.commit()
         
         Me.Output({
            "status"   : "SUBMITTED",
            "editcode" : editcode
         })
      else:
         Me.Abort()

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
