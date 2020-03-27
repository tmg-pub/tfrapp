# A script for deployment mirrors to ease the pain that is running Python on a
# shared server. Changes all shebangs to the executable you specify.
# Also sets 755 permissions on all python files so the webserver can execute them.
#
# Usage: python3 shebang.py "path to PYTHON BINARY"
import glob, os
import re
import sys

shebang = sys.argv[1]

for file in glob.glob("*.py"):
   if file == "shebang.py": continue
   with open( file, "r" ) as fp:
      content = fp.read()
   content = re.sub( r"^#!.+?\n", "#!" + shebang + "\n", content )
   with open( file, "w" ) as fp:
      fp.write( content );
   os.chmod( file, 0o755 )
   print( file )
   
print( "Done." )