#!/usr/bin/env python3
# TFRAPP by Potter-MoonGuard (c) 2020
import tfrapp as Me
import re

#------------------------------------------------------------------------------
# This reads the configuration/template file from a Google doc and parses out
#  the values. It packages them and returns them to the user javascript to
#                                                  render the application.
def main():
   Me.config["form_config_docid"]
   document = Me.GetGoogleDocsService().documents().get(
      documentId = Me.config["form_config_docid"]
   ).execute()
   
   document_content = document.get("body").get("content")
   content = []
   
   started = False
   for field in document_content:
   
      # Only supporting the 'paragraph' type elements. This is the bulk of any
      #  document, which, by the way, can get super hairy if you want to handle
      #  everything. Just look at their documentation page which is like
      #                                    418000 words of dumped data.
      para = field.get( "paragraph" )
      if not para: continue
      
      # First we search for a horizonal rule. This separates the document
      #                                       commentary from the data portion.
      if not started:
         if para["elements"][0].get("horizontalRule"):
            started = True
         continue
      
      html = ""
      for element in para["elements"]:
         if element.get("textRun"):
            text  = element["textRun"]["content"]
            style = element["textRun"]["textStyle"]
            
            # For each style that we support, append it to the html with the
            #  corresponding wrappers around it.
            if style.get("bold"):
               text = "<b>%s</b>" % text
            if style.get("italic"):
               text = "<i>%s</i>" % text
            if style.get("link"):
               text = "<a href=\"%s\" target=\"_blank\">%s</a>" % (style["link"]["url"], text)
            elif style.get("underline"):
               text = "<u>%s</u>" % text
               
            html += text

      # All paragraphs in google docs end with a newline character. We want to
      #  strip that newline out of our output, but we need to search for it
      #  before any of our html tags inserted too.
      # Not 100% sure why we don't just strip out all newline chars.
      html = re.sub( r"\n(.*)$", r"\1", html )
      content.append( html )
      
      
   # Now that we've got a list of html lines, it's time to parse those
   # into form elements.
   parts = []
   
   iter_index = 0
   
   # Helper functions to iterate through the content like a stream.
   # Returns the next line or "" if past the end of the input.
   def getline():
      nonlocal iter_index, content
      if iter_index == len(content): return ""
      line = content[iter_index].strip()
      iter_index += 1
      return line
      
   def endofcontent():
      nonlocal iter_index
      return iter_index == len(content)
      
   closer_text = ""
   
   while not endofcontent():
      line = getline()
      if not line: continue
      
      if line == "[AFTER SUBMISSION]":
         desc = ""
         while 1:
            line = getline()
            if not line: break
            desc += line + "\n"
         closer_text = desc
         continue
      
      if line == "[SECTION]":
         section_header = getline();
         desc = ""
         while 1:
            line = getline()
            if not line: break
            desc += line + "\n"
         desc = desc.strip()
         
         parts.append({
            "type"        : "header",
            "title"       : section_header,
            "description" : desc
         })
         continue
      
      # other field.
      fieldtext = line
      while 1:
         line = getline()
         if not line: break
         terminator = re.match( r"\[([^]]+)\]", line )
         if terminator:
            terms = terminator[1].upper().split( " " )
            if terms[0] == "TEXT":
               part = {
                  "type"   : "text",
                  "prompt" : fieldtext.strip()
               }
               if "PRIMARY" in terms:
                  part["primary"] = True
               if "OPTIONAL" in terms:
                  part["optional"] = True
               parts.append( part )
         else:
            fieldtext += "\n" + line
   
   # Wrap it up for the user.
   output = {
      "parts": parts,
      "closer_text": closer_text
   }
   
   Me.Output( output )

#//////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__': Me.Run( main )
