#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
# Testing sandbox.
from __future__ import print_function
from googleapiclient import errors
import json
import tfrapp as Me
import time

def main():
   input   = Me.GetRequestBody()
   db, dbc = Me.ConnectToDatabase()
   
   editcode = input["editcode"]
   
   curtime = int(time.time())
   
   dbc.execute( "SELECT (shortcut, editcode) "
                "FROM EditKeys WHERE editcode=%(editcode)", {
      "editcode": bytearray.fromhex(input["editcode"])
   })
   result = dbc.fetchone()
   if result:
      # We have an existing slot. Extend it.
      

   dbc.execute( "INSERT INTO EditKeys (editcode, docid) "
                "VALUES (%(editcode)s, %(docid)s)", {
               "editcode": bytearray.fromhex(editcode),
               "docid": response["response"]["result"]["docid"] })
   db.commit()
   Me.Put( """
{
      "poop": "pee"
   }
   """ )

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
