# TFRAPP by Potter-MoonGuard (c) 2020
# Setup tools. This should certainly not be executable on the server by users.
import sys
import tfrapp as Me

if len(sys.argv) < 2:
   print( "Admin setup tools. Not user friendly. To run the basic setup do:" )
   print( "> setup.py run" )
   sys.exit( 0 )
   
#//////////////////////////////////////////////////////////////////////////////
def BasicSetup():
   db, dbc = Me.ConnectToDatabase()
   
   # In case you want to reset everything.
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
   
if sys.argv[1] == "run":
   BasicSetup()
