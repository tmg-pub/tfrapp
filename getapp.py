#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
from __future__ import print_function
from googleapiclient import errors
import json
import tfrapp as Me

#------------------------------------------------------------------------------
# This is to read the application content from the server to update the
#  user's cache when using an edit link.
#
# TODO: Delete this. No longer used. The application contents are read directly
#  from the Google document now, and returned from checkapp.py.
def main():
   input = Me.GetRequestBody()
   db, dbc = Me.ConnectToDatabase()
   dbc.execute(
      "SELECT content FROM Apps WHERE editcode=%(editcode)s",
      {
         "editcode": input["editcode"]
      }
   )
   result = dbc.fetchone()
   
   if result:
      Me.Put({
         "status": "OK",
         "parts": json.loads(result[0])
      })
   else:
      Me.Abort()

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
