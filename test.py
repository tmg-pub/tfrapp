# TFRAPP by Potter-MoonGuard (c) 2020
from __future__ import print_function
from googleapiclient import errors
import json
import tfrapp as Me

# Just a testing sandbox script for development purposes.

def main():

   Me.Put( Me.MakeEditcode() )
   Me.Put( Me.MakeEditcode() )
   Me.Put( Me.MakeEditcode() )
   Me.Put( Me.MakeEditcode() )
   Me.Put( Me.MakeEditcode() )
   
   return 
   # db, dbc = ConnectToDatabase();
   # result = dbc.execute( "INSERT INTO Apps (editcode, docid) VALUES ( %(editcode)s, %(docid)s )", { 
         # "editcode":bytearray.fromhex("dead1234"), 
         # "docid":"hello"
      # })
   # db.commit()
   # print( result )
   
   # return
   
   """ Example to run the test script on the apps script thing. """
   SCRIPT_ID = Me.config["tfr_apps_script"]
   
   gscripts = Me.GetGoogleScriptsService()
   
   data = json.loads( """{"app":[{"title":"poop","value":"Cin’dy"}]}""" )
   
   # Create an execution request object.
   request = {"function": "test1", "devMode": True, "parameters": [ data ]}
   Me.ExecuteAppsScript( request, Me.config["tfr_apps_script"] )

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
