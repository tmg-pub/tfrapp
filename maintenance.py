# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me
import time

# System maintenance script. Should be called whenever periodically.

print( "Starting maintenance routine." )

print( "Connecting to database." )
db, dbc = Me.ConnectToDatabase()

curtime = int(time.time())
expire_time = curtime - 60 * 60 * 24 * 90 # 90 days

print( "--" )
print( "Deleting old applications from database. The google doc is permanent." )
dbc.execute( "DELETE FROM Apps WHERE updated < %(expire_time)s"
           , {
                "expire_time": expire_time
             })
db.commit()

print( "Done." )
