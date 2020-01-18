#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me
import uuid

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
   
   db, dbc = Me.ConnectToDatabase()
   docid    = None
   editcode = None
   
   if "editcode" in input:
      # Check their key and load a document ID.
      editcode = input["editcode"]
      docid = Me.LookupDocid( dbc, editcode )
      if not docid:
         Me.Abort()
   
   newdoc = False
   if not docid:
      newdoc = True
      # Editcodes are stored as hex everywhere except for in the database,
      #  where they are converted to 16-byte binary values.
      editcode = uuid.uuid4().hex
   
   script_arg = {
      "app": {
         "parts": input["parts"]
      },
      "editcode": editcode,
      "apps_folder": Me.config["apps_folder"],
      "discord": Me.config["discord_webhooks"]
   }
   
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
      
         if newdoc:
            # If we made a new document, then record the docid in the database
            #                                  under the editcode that we used.
            dbc.execute( "INSERT INTO Apps (editcode, docid) "
                        +"VALUES (%(editcode)s, %(docid)s)", {
                        "editcode": bytearray.fromhex(editcode),
                        "docid": response["response"]["result"]["docid"] })
            db.commit()
         
         Me.Output({ "status"   : "SUBMITTED",
                     "editcode" : editcode   })
      else:
         Me.Abort()

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
