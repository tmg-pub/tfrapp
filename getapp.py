#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
# Testing sandbox.
from __future__ import print_function
from googleapiclient import errors
import json
import tfrapp as Me

def main():
   Me.Put( """
{
      "poop": "pee"
   }
   """ )

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
