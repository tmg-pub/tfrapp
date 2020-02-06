# TFRAPP by Potter-MoonGuard (c) 2020
# Not executable on the server.
import sys
import tfrapp as Me

if len(sys.argv) < 2:
   print( "Admin setup tools. Not user friendly. To run the basic setup do:" )
   print( "> setup.py run" )
   sys.exit( 0 )
   
#//////////////////////////////////////////////////////////////////////////////
def BasicSetup():
   db, dbc = Me.ConnectToDatabase()
   #dbc.execute( """DROP TABLE Apps""" )
   
   # editcode: The code that we can use to edit or read the application.
   # docid: The ID of the generated Google document that the app is linked to.
   # updated: The time (posix) that we last updated the app. Can be used to
   #          expire old edit links so they can't build up.
   # content: Contents of their application, store in JSON.
   dbc.execute( """
      CREATE TABLE IF NOT EXISTS Apps (
        editcode VARCHAR(16) PRIMARY KEY,
        docid VARCHAR(128),
        updated BIGINT,
        content TEXT
      )
   """)
   
#   dbc.execute( """
#      CREATE TABLE IF NOT EXISTS EditKeys (
#        shortcut VARCHAR(16) PRIMARY KEY,
#        editcode BINARY(16) UNIQUE,
#        expires BIGINT
#      )
#   """)
   
if sys.argv[1] == "run":
   BasicSetup()
   
