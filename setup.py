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
   
   dbc.execute( """
      CREATE TABLE IF NOT EXISTS Apps (
        submission_id BINARY(16) PRIMARY KEY,
        docid VARCHAR(128)
      )
   """)
   
if sys.argv[1] == "run":
   BasicSetup()
   
