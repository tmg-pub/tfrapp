#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me
import json

#------------------------------------------------------------------------------
# API for users to submit applications.
# Request is in the format:
# {
#    editcode: If given, we will try to edit an existing application rather
#              than creating a new one.
#    parts: Parts of the application. Includes both prompts and answers.
# }
#

#------------------------------------------------------------------------------
# Returns the applicant's name from their answers. Used for the log file.
def GetAppName( parts ):
   try:
      for part in parts:
         if( part["key"] == "NAME" ):
            return part["val"]
   except: pass
   
   return "(Unknown)"

#------------------------------------------------------------------------------
def main():
   input = Me.GetRequestBody()
   
   db, dbc  = Me.ConnectToDatabase()
   docid    = None
   editcode = None
   
   Me.Log( "User is submitting an app." )
   
   if "editcode" in input:
      Me.Log( "User is updating their app. Editcode=%s" % input["editcode"] )
      # Check their key and load a document ID. If it exists, then that
      #  document will be updated.
      editcode = input["editcode"]
      docid = Me.LookupDocid( dbc, editcode )
      if not docid:
         # That editcode isn't registered.
         # In the future, we should block people from testing too many
         #  editcodes.
         Me.Abort()
   
   newdoc = False
   if not docid:
      # Creating a new document. Generate a new editcode for it.
      newdoc   = True
      editcode = Me.MakeEditcode()
      Me.Log( "New document. Editcode = ", editcode )
   
   Me.Log( "Building submit request. Name = %s" % GetAppName( input["parts"] ))
   
   script_arg = {
      "editcode"       : editcode,
      "apps_folder"    : Me.config["apps_folder"],
      "discord"        : Me.config["discord_webhooks"],
      "site_url"       : Me.config["site_url"],
      "app"            : {
         "parts": input["parts"]
      },
   }
   # If this is set, then an existing document will be updated,
   # otherwise, a new document will be created.
   if docid: script_arg["docid"] = docid
   
   # This will cause the GAS side to assign a new owner after we're done
   #  creating the document.
   if "document_owner" in Me.config:
      script_arg["document_owner"] = Me.config["document_owner"]
   
   response = Me.ExecuteAppsScript(
      {
         "function"   : "API_SubmitApplication",
         "devMode"    : Me.Devmode(),
         "parameters" : [ script_arg ]
      },
      Me.config["tfr_apps_script"]
   );
   
   if not response:
      Me.Abort()
   else:
      if response["response"]["result"]["status"] == "OK":
         
         Me.Log( "Inserting/updating entry in database." )
         # Save a record in our database of everything so that the user can
         #  easily access it through the editcode.
         # We don't use the `content` field anymore, in favor of just reading
         #  the google document directly, but it doesn't hurt to have a mirror
         #  of their application in case something goes wrong on the GAS side
         #  (their work can be recovered by an admin).
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
         
         # The user will save the editcode and show the finish page. Otherwise
         #  they will get a server error message.
         Me.Log( "Responding to user." )
         Me.Output({
            "status"   : "SUBMITTED",
            "editcode" : editcode
         })
      else:
         Me.Abort()

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
