// TFR APPS by Potter-MoonGuard (c) 2020
//
// An API to submit and modify applications.
///////////////////////////////////////////////////////////////////////////////
var NOW = new Date();

//-----------------------------------------------------------------------------
// This is a typical response template. Fill it in with whatever data for an OK
//  response and then return it.
var RESPONSE_OK = {
  "status": "OK",
}

//-----------------------------------------------------------------------------
// Response value when they give a bad edit code.
var ERROR_CANNOT_EDIT = {
  "status": "ERROR",
  "error" : "CANNOT_EDIT",
  "desc"  : "Document does not have an edit code, or the wrong edit code was given."
}

//-----------------------------------------------------------------------------
// Response value when something goes wrong with the document loading.
var ERROR_CANNOT_OPEN = {
  "status": "ERROR",
  "error" : "CANNOT_OPEN",
  "desc"  : "Document ID is invalid."
}

//-----------------------------------------------------------------------------
// Typical response error value. Don't need to be too verbose with errors,
//  giving more info for bad input means helping out exploiters.
var ERROR_BAD_REQUEST = {
  "status" : "ERROR",
  "error"  : "Bad Request"
}

//-----------------------------------------------------------------------------
// Returns a long timestamp for central time.
function fullTimestamp() {
  return Utilities.formatDate( NOW, "America/Chicago", "EEEE, MMMM d, yyyy  HH:mm a 'CT'" )
}

//-----------------------------------------------------------------------------
var FIELD_REGEX = /^\s*([^:]+):\s*(.*?)\s*$/mi;

//-----------------------------------------------------------------------------
// Returns an element that holds a header field (at the top of the document).
// If an existing element doesn't exist for a field, then one will be inserted.
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
// Reads a field at the top of the document.
function getHeaderField( document, field ) {
  var para = getHeaderElement( document, field );
  if( !para ) return null;
  var match = para.getText().match( FIELD_REGEX );
  return match[2];
}

//-----------------------------------------------------------------------------
// Sets a field at the top of the document. If the field doesn't exist, it will
//  be inserted.
function setHeaderField( document, field ) {
  var para = getHeaderElement( document, field, true );
  para.clear();
  para.appendText( field + ":" ).setBold(true);
  para.appendText( " " ).setBold(false);
  return para;
}

//-----------------------------------------------------------------------------
// Returns the child index of one of the section headers. Headers are made
//  with HEADING3 style. These are not related to the document headers, above.
function findHeaderIndex( document, title ) {
  title = title.toUpperCase();
  var body = document.getBody();
  for( var range = null; range = body.findElement( DocumentApp.ElementType.PARAGRAPH, range ); ) {
    var para = range.getElement().asParagraph();
    if( para.getHeading() == DocumentApp.ParagraphHeading.HEADING3
        && para.getText().trim().toUpperCase() == title ) {
      return body.getChildIndex( para );
    }
  }
  return null;
}

//-----------------------------------------------------------------------------
// Erases all of the CONTENTS part of an application, to make way for an
//  update.
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
// Strip HTML tags and do some basic formatting hacks to prettify an
//  application prompt or description.
function stripPromptFormat( prompt ) {
  prompt = prompt.replace( /\n/g, " " );
  prompt = prompt.replace( /  /g, " " );
  prompt = prompt.replace( /<br>/g, "\n" );
  prompt = prompt.replace( /<li>/g, "\n• " );
  return prompt.replace( /<[^>]*>/g, "" );
}

//-----------------------------------------------------------------------------
// Insert application contents from the request into the document at the
//  specified child index.
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
    if( part.type == "section" ) {
      body.insertParagraph( index++, part.title )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      .setFontSize( 14 ).setBold(true);
      body.insertParagraph( index++, stripPromptFormat(part.description) )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      .setFontSize( 11 ).setItalic(true);
      body.insertParagraph( index++, "" )
    } else if( part.type == "text" ) {
      var prompt = stripPromptFormat( part.prompt );
      
      body.insertParagraph( index++, prompt )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL )
      .setForegroundColor( "#666666" ).setBold( true );
      body.insertParagraph( index++, part.key ).setForegroundColor( "#FFFFFF" );
      body.insertParagraph( index++, part.val )
      .setHeading( DocumentApp.ParagraphHeading.NORMAL );
      body.insertParagraph( index++, "" );
    }
  }
  body.insertHorizontalRule( index++ );
}

//-----------------------------------------------------------------------------
// Returns the child index of the element directly after the horizontal rule
//  of the STATUS section (the rule marks the start of the content).
function getAppStatusStartIndex( document ) {
  var body = document.getBody();
  var index = findHeaderIndex( document, "STATUS" );
  if( !index ) return null;
  var started = false;
  // Search for the horizontal rule that starts the visible part.
  // Horizontal rule is also considered a paragraph.
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
  
  if( !started ) return null;
  
  return index + 1;
}

//-----------------------------------------------------------------------------
// Reads the STATUS section of a document and convert it to HTML to send to the
//  user.
function getAppStatus( document ) {
  Logger.log( "Getting applicaton's STATUS section." );
  var body = document.getBody();
  var index = getAppStatusStartIndex( document );
  if( !index ) {
    Logger.log( "Didn't find STATUS section content." );
    return "";
  }
  var html = "";
  // TODO: beter content trimming afterwards?
  // Don't insert <br> until the end?
  
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
// Parses the CONTENTS section and builds a map of key values for each
//  field in the application.
function getAppInput( document ) {
  
  var body = document.getBody();
  var index = findHeaderIndex( document, "CONTENTS" );
  if( !index ) return [];
  index++;
  
  var parts = {};
  for( ; index < body.getNumChildren(); index++ ) {
    var child = body.getChild(index);
    Logger.log( child.getText() );
    if( child.getType() == DocumentApp.ElementType.PARAGRAPH ) {
      var para = child.asParagraph();
      if( para.getHeading() == DocumentApp.ParagraphHeading.HEADING3 ) break; // Start of next section.
      
      var fc = para.getForegroundColor();
      if( fc && fc == "#ffffff" ) {
        // Keys are hidden in white text.
        var part_key = para.getText();
        var part_text = "";
        index++;
        // Scan to next
        var text = "";
        while( index < body.getNumChildren() ) {
          var child2 = body.getChild(index);
          if( child2.getType() == DocumentApp.ElementType.PARAGRAPH ) {
            var para2 = child2.asParagraph();
            
            if( (para2.getHeading() == DocumentApp.ParagraphHeading.HEADING3)
                || para2.isBold() ) { index--; break; } // Start of next section or next prompt.
            
            part_text += para2.getText();
            index++;
          }
        }
        parts[part_key] = part_text;
      }
    }
  }
  return parts;
}

//-----------------------------------------------------------------------------
function resetApplication( document, editcode, site_url ) {
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
  
  // Space for them to feel comfy writing in.
  body.appendParagraph( "" )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  body.appendParagraph( "" );
  body.appendParagraph( "" );
  body.appendParagraph( "" );
  body.appendParagraph( "" );
  
  body.appendParagraph( "STATUS" ).setHeading( DocumentApp.ParagraphHeading.HEADING3 ).setBold( true );
  body.appendParagraph( 
    "Text written below this line is viewable by the applicant on the submission "
    +"page. It should be BRIEF and reflect the status of their application, examples:" )
  .setHeading( DocumentApp.ParagraphHeading.NORMAL )
  .setFontSize( 9 ).setForegroundColor( "#999999" ).setItalic( true );
  body.appendParagraph( "\"Your application has been accepted. Please contact an officer for an interview.\"" );
  body.appendParagraph( "\"Your application has been rejected. (And give reasoning.)\"" );
  body.appendParagraph( "\"Your application needs changes. Please (edit and update what's wrong).\"" );
  body.appendParagraph( "" );
  body.appendParagraph( "You should send a comprehensive letter ingame when you update their "
                       +"application status. If you need the applicant to make changes to their application, "
                       +"include this link in the ingame mail: " + site_url + "/edit/" + editcode );
  
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
// Erase any text in the STATUS section. This is done whenever the user edits
//  their application (sets it back to "under review").
function resetAppStatus( document ) {
  Logger.log( "Resetting application STATUS." );
  var body  = document.getBody();
  var index = getAppStatusStartIndex( document );
  while( index < body.getNumChildren() ) {
    
    var child = body.getChild(index);
    Logger.log( index );
    Logger.log( child.getText() );
    
    if( child.getType() == DocumentApp.ElementType.PARAGRAPH
       && child.asParagraph().getHeading() == DocumentApp.ParagraphHeading.HEADING3 ) {
      // Shouldn't be another section, but maybe there might be in the future.
      break;
    }
    
    if( index == body.getNumChildren() - 1 ) {
      // Cannot remove last child???
      child.asParagraph().clear();
      break;
    } else {
      body.removeChild( child );
    }
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

//-----------------------------------------------------------------------------
// Searches through an app (from request) for the fieldname.
function getAppField( app, fieldname ) {
  var parts = app.parts;
  Logger.log(app);
  for( var i in parts ) {
    if( parts[i].key == fieldname ) {
      var a = parts[i].val || "";
      a = a.trim();
      if( a.length == 0 ) break;
      return a
    }
  }
  return "";
}

//-----------------------------------------------------------------------------
// Broadcast to Discord that an application was created or updated.
// `title` is the title to use in the embed.
// `document` is the main Document instance.
// `webhooks` is the discord field from the request body.
// `app` is the app field from the request body.
// `updating` is true if this is an update and not a new application.
function broadcastToDiscord( title, document, webhooks, app, updating ) {
  Logger.log( "Broadcasting to Discord!" );
  var data = {
    content: "",
    embeds: [{
      author: {},
      title: title,
      url: document.getUrl(),
    }]
  };
  
  var desc = "";
  
  if( updating ) {
    data.embeds[0].author.name = "Application Updated";
    desc += "*An application has been updated and needs review.*\n\n"
    desc += "**Character**\n"     + getAppField( app, "OOC_NAME"           ) + "\n\n"
          + "**Discord**\n"       + getAppField( app, "DISCORD"            ) + "\n\n";
    data.embeds[0].color = 15524734; // westfall yellow
  } else {
    data.embeds[0].author.name = "New Application";
    desc += "*A new application has been submitted and needs review.*\n\n"
    desc += "**Fields of Interest:**\n"   + getAppField( app, "FIELDS_OF_INTEREST"    ) + "\n\n"
          + "**Character**\n"             + getAppField( app, "OOC_NAME"              ) + "\n\n"
          + "**Discord**\n"               + getAppField( app, "DISCORD"               ) + "\n\n"
          + "**RP Experience**\n"         + getAppField( app, "RP_EXPERIENCE"         ) + "\n\n"
          + "**Referral**\n"              + getAppField( app, "REFERRAL"              ) + "\n\n"
          + "**Character Description**\n" + getAppField( app, "CHARACTER_DESCRIPTION" ) + "\n\n";
          
    data.embeds[0].color = 5102410; // fel green
  }
  
  if( desc.length > 1500 ) {
    desc = desc.substring( 0, 1500 ) + "...";
  }
  
  data.embeds[0].description = desc;
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify( data )
  };
  
  for( var i in webhooks ) {
    Logger.log( "Sending to webhook " + i );
    var webhook = webhooks[i].url
    // wait=true in the querystring will cause the request to wait for confirmation.
    // If it fails, then send an emergency email about it.
    var response = UrlFetchApp.fetch( webhook + "?wait=true", options );
    if( response.getResponseCode() != 200 ) {
      message = 
        "Generated from TFR APPS script.\n"
      + "Application title: " + title + "\n"
      + "Updating: " + updating ? "Yes\n" : "No\n"
      + "Last part of Discord webhook: " + webhook.substring( webhook.length - 16 );
      
      MailApp.sendEmail( "tmg@clubtammy.info",
                        "Discord webhook failed when posting TFR app!",
                        message );
    }
  }
}

//-----------------------------------------------------------------------------
// Entry point for the API to submit an application.
// event structure is as follows: {
//   docid: If this is set, then we will try to update a document with this id.
//          The document can only be updated if the editcode given matches the
//           one stored in the document, and if the document is present in the
//           base applications folder.
//   editcode: The editcode to check in the document, or the editcode to write
//              into a new document. In other words, this is generated by the
//              front server, not this script.
//   app: The user's application contents.
//   {
//     parts: The parts of the application. The entries are indexed by an
//             incrementing integer (ordered as they should appear), and may
//             be in the following formats:
//             {
//                type: The type of this part, may be "section" or "text".
//                key: The internal name of this part.
//                for "section":
//                  title: The title caption of the section.
//                  description: The text that follows underneath.
//                for "text":
//                  prompt: The question presented to the user.
//                  val: The input they gave for this field.
//             }
//   }
//   apps_folder: This must contain the drive folder ID to store new
//                applications in. Applications must also be present in this
//                folder to be considered "editable".
//   discord: A list of discord webhook information to broadcast updates to.
//   {
//      url: Webhook API url.
//   }
// }
function API_SubmitApplication( event ) {

  // Don't forget sanitization!
  Logger.log( "New application being submitted." );
  Logger.log( "Document ID: %s", event.docid );
  Logger.log( "Editcode: %s", event.editcode );
  var document;
  var updating = false;
  var title = getAppField( event.app, "NAME" );
  if( !title ) {
    Logger.log( "User didn't submit name." )
    return ERROR_BAD_REQUEST;
  }
  
  if( !event.apps_folder ) return ERROR_BAD_REQUEST;
  
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
    document.setName( "[APP] " + title );
    updating = true;
  } else {
    // Create a new document.
    Logger.log( "Creating new document." );
    var folder = DriveApp.getFolderById( event.apps_folder )
    
    document = DocumentApp.create( "[APP] " + title );
    
    var doc_file = DriveApp.getFileById( document.getId() )
    var parent_folder = doc_file.getParents().next();
    folder.addFile( doc_file );
    parent_folder.removeFile( doc_file );
    document = DocumentApp.openById( doc_file.getId() );
    doc_file.setSharing( DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW );
    // TODO: Set owner too.
    resetApplication( document, event.editcode, event.site_url );
  }
  
  Logger.log( "Document ID is: %s", document.getId() );
  var index_for_contents = resetApplicationContents( document );
  insertApplicationContents( document, index_for_contents, event.app );
  
  if( updating ) {
    // When updating, set the update time and erase old status.
    Logger.log( "Setting document updated field." );
    setHeaderField( document, "Date updated" ).appendText( fullTimestamp() );
    resetAppStatus( document );
  }
  
  broadcastToDiscord( title, document, event.discord, event.app, updating );
  
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
  
  RESPONSE_OK.editable  = userCanEdit( document, event.apps_folder, event.editcode );
  RESPONSE_OK.appstatus = getAppStatus( document );
  RESPONSE_OK.input     = getAppInput( document );
  Logger.log(RESPONSE_OK.appstatus);
  return RESPONSE_OK;
}

function test() {
  document = DocumentApp.openById( "17kctBHvrzSU-CcVZdW09OjKvg07mhN1f--TDMdOyx5M" );
  Logger.log( getAppInput( document ) );
  //resetApplication( document );
  resetAppStatus( document );
}