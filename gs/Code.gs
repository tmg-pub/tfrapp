// TFR APPS by Potter-MoonGuard (c) 2020
//
// An API to submit and modify applications.
///////////////////////////////////////////////////////////////////////////////
var NOW = new Date();

//-----------------------------------------------------------------------------
var RESPONSE_OK = {
  "status": "OK",
}

//-----------------------------------------------------------------------------
var ERROR_CANNOT_EDIT = {
  "status": "ERROR",
  "error" : "CANNOT_EDIT",
  "desc"  : "Document does not have an edit code, or the wrong edit code was given."
}

//-----------------------------------------------------------------------------
var ERROR_CANNOT_OPEN = {
  "status": "ERROR",
  "error" : "CANNOT_OPEN",
  "desc"  : "Document ID is invalid."
}

//-----------------------------------------------------------------------------
var ERROR_BAD_REQUEST = {
  "status" : "ERROR",
  "error"  : "Bad Request"
}

//-----------------------------------------------------------------------------
function fullTimestamp() {
  return Utilities.formatDate( NOW, "America/Chicago", "EEEE, MMMM d, yyyy  HH:mm a 'CT'" )
}

//-----------------------------------------------------------------------------
var FIELD_REGEX = /^\s*([^:]+):\s*(.*?)\s*$/mi;

//-----------------------------------------------------------------------------
function getHeaderElement( document, field, insert ) {
  var regex = FIELD_REGEX( field );
  var body = document.getBody();
  for( var range = null; range = body.findElement( DocumentApp.ElementType.PARAGRAPH, range ); ) {
    var para = range.getElement().asParagraph();
    if( para.getHeading() == DocumentApp.ParagraphHeading.HEADING3 && para.getText().trim() == "APPLICATION SUBMISSION" ) {
      var insert_point = para;
      for( ; range = body.findElement( DocumentApp.ElementType.PARAGRAPH, range ); ) {
        var para = range.getElement().asParagraph();
        if( para.getHeading() == DocumentApp.ParagraphHeading.HEADING3 ) {
          if( insert ) {
            return body.insertParagraph( body.getChildIndex(insert_point)+1, "" );
          } else {
            break;
          }
        }
        var match = para.getText().match( FIELD_REGEX );
        if( match && match[1].toLowerCase() == field.toLowerCase() ) {
          return para;
        }
        if( para.getText().trim() != "" ) insert_point = para;
      }
      break;
    }
  }
  return null;
}

//-----------------------------------------------------------------------------
function getHeaderField( document, field ) {
  var para = getHeaderElement( document, field );
  if( !para ) return null;
  var match = para.getText().match( FIELD_REGEX );
  return match[2];
}

//-----------------------------------------------------------------------------
function setHeaderField( document, field ) {
  var para = getHeaderElement( document, field, true );
  para.clear();
  para.appendText( field + ":" ).setBold(true);
  para.appendText( " " ).setBold(false);
  return para;
}

//-----------------------------------------------------------------------------
function resetApplicationContents( document ) {
  Logger.log( "Resetting application contents." )
  var body = document.getBody();
  for( var range = null; range = body.findElement( DocumentApp.ElementType.PARAGRAPH, range ); ) {
    var para = range.getElement().asParagraph();
    if( para.getHeading() == DocumentApp.ParagraphHeading.HEADING3 && para.getText().trim() == "CONTENTS" ) {
      var index = body.getChildIndex(para) + 1;
      while( index < body.getNumChildren() - 1 ) {
        var child = body.getChild(index);
        if( child.getType() == DocumentApp.ElementType.PARAGRAPH
           && child.asParagraph().getHeading() == DocumentApp.ParagraphHeading.HEADING3 ) {
          return index;
        }
        body.removeChild( child );
      }
    }
  }
}

//-----------------------------------------------------------------------------
function stripPromptFormat( prompt ) {
  prompt = prompt.replace( /<li>/g, "• " );
  return prompt.replace( /<[^>]*>/g, "" );
}

//-----------------------------------------------------------------------------
function insertApplicationContents( document, index, app ) {
  Logger.log( "Inserting new application contents." )
  
  var body = document.getBody();
  body.insertParagraph( index++, "Text here will be erased if the applicant updates their submission. Do not write here." )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  .setFontSize( 9 ).setForegroundColor( "#999999" ).setItalic( true );
  body.insertParagraph( index++, "" )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  
  for( var i in app.parts ) {
    var part = app.parts[i];
    if( part.type == "header" ) {
      body.insertParagraph( index++, part.title )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      .setFontSize( 14 ).setBold(true);
      body.insertParagraph( index++, part.description )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      .setFontSize( 11 ).setItalic(true);
      body.insertParagraph( index++, "" )
    } else if( part.type == "text" ) {
      var prompt = stripPromptFormat( part.prompt );
      
      body.insertParagraph( index++, prompt )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      .setForegroundColor( "#666666" ).setBold( true );
      body.insertParagraph( index++, "" )
      body.insertParagraph( index++, part.val )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      body.insertParagraph( index++, "" )
      
    }
    
  }
  body.insertHorizontalRule( index++ );
}

function findHeaderIndex( document, title ) {
  title = title.toUpperCase();
  var body = document.getBody();
  for( var range = null; range = body.findElement( DocumentApp.ElementType.PARAGRAPH, range ); ) {
    var para = range.getElement().asParagraph();
    if( para.getHeading() == DocumentApp.ParagraphHeading.HEADING3 && para.getText().trim().toUpperCase() == title ) {
      return body.getChildIndex( para );
    }
  }
  return null;
}

//-----------------------------------------------------------------------------
function getApplicationPostSection( document ) {
  Logger.log( "Getting applicaton's POST section." );
  var body = document.getBody();
  var index = findHeaderIndex( document, "POST" );
  if( !index ) return "";
  var html = "";
  var started = false;
  
  index++;
  for( ; index < body.getNumChildren(); index++ ) {
    var child = body.getChild(index);
    if( child.getType() == DocumentApp.ElementType.PARAGRAPH ) {
      if( child.asParagraph().findElement(DocumentApp.ElementType.HORIZONTAL_RULE) ) {
        started = true;
        break;
      }
      if( child.asParagraph().getHeading() == DocumentApp.ParagraphHeading.HEADING3 ) break;
    }
  }
  
  if( !started ) {
    Logger.log( "  Didn't find divider." );
    return "";
  }
  
  index++;
  for( ; index < body.getNumChildren(); index++ ) {
    var child = body.getChild(index);
    if( child.getType() == DocumentApp.ElementType.PARAGRAPH ) {
      var para = child.asParagraph();
      if( para.getHeading == DocumentApp.ParagraphHeading.HEADING3 ) break;
      if( html != "" ) html += "<br>\n";
      
      for( var i = 0; i < para.getNumChildren(); i++ ) {
        var part = para.getChild(i);
        
        if( part.getType() == DocumentApp.ElementType.TEXT ) {
          var source = part.getText();
          var indexes = part.getTextAttributeIndices();
          for( var format_index = 0; format_index < indexes.length; format_index++ ) {
            // We will read past the end of the array here, but that's okay to pass
            //  `undefined` into the substring function to get the rest of the string.
            var str = source.substring( indexes[format_index], indexes[format_index+1] );
            var style = part.getAttributes( indexes[format_index] );
            var spanstyle = [];
            if( style.BOLD ) {
              str = "<b>" + str + "</b>";
            }
            if( style.ITALIC ) {
              str = "<i>" + str + "</i>";
            }
            if( style.UNDERLINE ) {
              str = "<u>" + str + "</u>";
            }
            
            if( style.FOREGROUND_COLOR && style.FOREGROUND_COLOR != "#000000" ) {
              spanstyle.push( "color: " + style.FOREGROUND_COLOR );
            }
            
            if( spanstyle.length > 0 ) {
              str = "<span style='" + spanstyle.join("; ") + "'>" + str + "</span>";
            }
            html += str;
          }
        }
        
      }
    }
  }
  
  return html;
}

//-----------------------------------------------------------------------------
function resetApplication( document, editcode ) {
  Logger.log( "Resetting document. Editcode %s", editcode )
  var body = document.getBody();
  body.clear();
  body.setMarginLeft(36);
  body.setMarginRight(36);
  body.setMarginTop(36);
  body.setMarginBottom(36);
  
  // Setup header1 attributes.
  var s = {};
  s[DocumentApp.Attribute.BOLD]           = true; // Stupid bug in api that's 3 years old won't let us do this.
  s[DocumentApp.Attribute.ITALIC]         = false;
  s[DocumentApp.Attribute.UNDERLINE]      = false;
  s[DocumentApp.Attribute.SPACING_BEFORE] = 11;
  s[DocumentApp.Attribute.SPACING_AFTER]  = 0;
  s[DocumentApp.Attribute.FONT_SIZE]      = 14;
  s[DocumentApp.Attribute.FOREGROUND_COLOR] = "#434343";
  body.setHeadingAttributes( DocumentApp.ParagraphHeading.HEADING3, s );
  
  Logger.log( body.getHeadingAttributes( DocumentApp.ParagraphHeading.HEADING3 ) );
  
  var firstpara = body.getChild(0);
  firstpara.setHeading( DocumentApp.ParagraphHeading.HEADING3 );
  firstpara.asParagraph().appendText( "APPLICATION SUBMISSION" ).setBold( true )
  firstpara.setSpacingBefore( 0 );
  
  body.appendParagraph( "CONTENTS" ).setHeading( DocumentApp.ParagraphHeading.HEADING3 ).setBold( true );
  
  body.appendParagraph( "NOTES" ).setHeading( DocumentApp.ParagraphHeading.HEADING3 ).setBold( true );
  body.appendParagraph( "This section is for officers to write in." )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  .setFontSize( 9 ).setForegroundColor( "#999999" ).setItalic( true );
  body.appendParagraph( "" )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  body.appendParagraph( "" );
  body.appendParagraph( "" );
  body.appendParagraph( "" );
  body.appendParagraph( "" );
  
  body.appendParagraph( "POST" ).setHeading( DocumentApp.ParagraphHeading.HEADING3 ).setBold( true );
  body.appendParagraph( 
    "Text written below this line is viewable by the applicant on the submission "
    +"page. Due to the nature of an accountless setup, this should not be treated "
    +"as a reliable medium – if the user clears their browser cache, they will not "
    +"be able to view it." )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  .setFontSize( 9 ).setForegroundColor( "#999999" ).setItalic( true );
  
  body.appendHorizontalRule();
  body.appendParagraph( "" )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  
  setHeaderField( document, "Date created" ).appendText( fullTimestamp() );
  setHeaderField( document, "Date updated" ).appendText( "-" );
  
  if( editcode ) {
    var writer = setHeaderField( document, "Edit code" )
    writer.appendText( editcode ).setFontSize( 8 )
    writer.appendText( " (Erase this line to disable further edits from the applicant.)" )
    .setForegroundColor( "#AAAAAA" ).setFontSize( 8 );
  }
}

//-----------------------------------------------------------------------------
// Returns true if the document can be edited by the user. The conditions are:
// • User must know the editcode stored in the document, and the document
//   must still contain that editcode.
// • The document must be present in the base applications folder.
function userCanEdit( document, apps_folder, user_editcode ) {
  editcode = getHeaderField( document, "Edit code" );
  if( !editcode ) return false;
  editcode = editcode.match( /^[^\s\(]+/ );
  if( !editcode || (editcode[0] != user_editcode) ) return false;
  
  parents = DriveApp.getFileById( document.getId() ).getParents();
  for( var folder; parents.hasNext(); ) {
    folder = parents.next();
    if( folder.getId() == apps_folder ) {
      return true;
    }
  }
  
  return false;
}

function documentTitleFromApp( app ) {
  var parts = app.parts;
  for( var i in parts ) {
    if( parts[i].primary ) {
      var a = parts[i].val || "";
      a = a.trim();
      if( a.length == 0 ) break;
      return "APP: " + a
    }
  }
  return null;
}

//-----------------------------------------------------------------------------
// Entry point for the API to submit an application.
// event structure is as follows: {
//   docid: If this is set, then we will try to update a document with this id.
//          The document can only be updated if the editcode given matches the
//           one stored in the document, and if the document is present in the
//           base applications folder.
//   editcode: The editcode to check in the document, or the editcode to write
//              into a new document. In other words, this is originally
//              generated by the user, not this script.
//   app: The user's application contents.
//   {
//     parts: The parts of the application. The entries are indexed by an
//             incrementing integer, and may be in the following formats:
//             {
//                type: "header" - This is a section header.
//                title: The title caption of the section.
//                description: The text that follows underneath.
//             }
//             {
//                type: "text" - This is a text input.
//                prompt: The question presented to the user.
//                primary: If true, this is the "primary" text field, the one
//                         where the document title is grabbed from.
//             }
//     input: The user's input. The keys for this match the ones in parts for
//            any fields that accept input. "header" parts will not have a
//            corresponding input part.
//   }
// }
function API_SubmitApplication( event ) {

  // Don't forget sanitization!
  Logger.log( event.app.parts[1].val );
  Logger.log( "New application being submitted." );
  Logger.log( "Document ID: %s", event.docid );
  Logger.log( "Editcode: %s", event.editcode );
  var document;
  var updating = false;
  if( event.docid ) {
    try {
      document = DocumentApp.openById( event.docid );
    } catch( err ) {
      // Bad ID.
      Logger.log( "Couldn't open document." )
      return ERROR_CANNOT_EDIT;
    }
    
    // Verify that the document can be written to.
    if( !userCanEdit( document, event.apps_folder, event.editcode )) {
      Logger.log( "User submitted invalid editcode." );
      return ERROR_CANNOT_EDIT;
    }
    
    Logger.log( "Going to edit document." );
    updating = true;
  } else {
    // Create a new document.
    Logger.log( "Creating new document." );
    var folder = DriveApp.getFolderById( event.apps_folder )
    
    var title = documentTitleFromApp( event.app );
    if( !title ) {
      Logger.log( "User didn't submit name." )
      return ERROR_BAD_REQUEST;
    }
    document = DocumentApp.create( title );
    
    var doc_file = DriveApp.getFileById( document.getId() )
    var parent_folder = doc_file.getParents().next();
    folder.addFile( doc_file );
    parent_folder.removeFile( doc_file );
    document = DocumentApp.openById( doc_file.getId() );
    doc_file.setSharing( DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW );
    // TODO: Set owner too.
    resetApplication( document, event.editcode );
  }
  
  Logger.log( "Document ID is: %s", document.getId() );
  var index_for_contents = resetApplicationContents( document );
  insertApplicationContents( document, index_for_contents, event.app );
  
  if( updating ) {
    Logger.log( "Setting document updated field." );
    setHeaderField( document, "Date updated" ).appendText( fullTimestamp() );
  }
  
  Logger.log( "Responding to caller." );
  RESPONSE_OK.docid = document.getId();
  RESPONSE_OK.editcode = event.editcode;
  return RESPONSE_OK;
}

//-----------------------------------------------------------------------------
function API_Check( event ) {
  Logger.log( "A document is being checked." );
  if( !event.docid ) {
    Logger.log( "Event was missing docid field." );
    return BAD_REQUEST;
  }
  Logger.log( "Document ID is %s", event.docid );
  
  try {
    document = DocumentApp.openById( event.docid );
  } catch( err ) {
    Logger.log( "Couldn't open document." );
    return ERROR_CANNOT_OPEN;
  }
  
  RESPONSE_OK.editable = userCanEdit( document, event.apps_folder, event.editcode );
  RESPONSE_OK.post = getApplicationPostSection( document );
  Logger.log(RESPONSE_OK.post);
  return RESPONSE_OK;
}


function test1( event ) {
  Logger.log( event.app[0] );
}

//---------------------------------------------------------------------
function test() {
  //API_SubmitApplication( JSON.parse(SAMPLE) )
  Logger.log( { "1": "test1", "2": "test2" } );
  return;
  
  API_Check( {
    docid: "xxx",
    editcode: "xxx"
  });
  
  return;
  var document = DocumentApp.openById( "xxx" );
  //resetApplication( document, 2350 );
  var index = resetApplicationContents( document );
  document.getBody().insertParagraph( index++, "Text here may be erased if the applicant updates their submission. Do not write here." )
  .setHeading(DocumentApp.ParagraphHeading.NORMAL)
  .setFontSize( 9 ).setForegroundColor( "#999999" ).setItalic( true );
  
  
  /*
  //Logger.log( getDetailsField( document, "Date created" ))
  Logger.log( getHeaderField( document, "Date created" ));
  var timestamp = fullTimestamp();
  
  var writer = setHeaderField( document, "Date updated" );
  .appendText( timestamp );
  
  var writer = setHeaderField( document, "Edit code" );
  writer.appendText( "03252808235 " );
  writer.appendText( "(Delete this line to disable further edits from the applicant.)" )
  .setForegroundColor( "#AAAAAA" );*/
}

