# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me
import time

# Maintenance script. Should be called periodically to clean out old files, just like you should clean those vents in your computer.

print( "Starting maintenance routine." )
#------------------------------------------------------------------------------

print( "Connecting to database." )
db, dbc = Me.ConnectToDatabase()

curtime = int(time.time())

# The time before old application links are killed.
expire_time = curtime - 60 * 60 * 24 * 90 # 90 days

print( "--" )
print( "Deleting old application links from database. The google doc is permanent for your records." )
dbc.execute( "DELETE FROM Apps WHERE updated < %(expire_time)s"
           , {
                "expire_time": expire_time
             })
db.commit()

# Todo: delete old log files!

print( "Done." )
