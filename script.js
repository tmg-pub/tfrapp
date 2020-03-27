///////////////////////////////////////////////////////////////////////////////
// TFRAPP by Potter-MoonGuard (c) 2020
console.log( "Hello happy developer. :)" );
console.log( "This happy code brought to you by Potter-MoonGuard." );
console.log( "Minifying is for nerds and corporations." );

let g_config = {};
let g_buttons_enabled = true;
///////////////////////////////////////////////////////////////////////////////

//-----------------------------------------------------------------------------
// Show the notification overlay. Background can change according to severity.
function Notify( html, background, foreground ) {
   background = background || "#333";
   foreground = foreground || "#fff";
   $("#notify").addClass( "visible" );
   $("#notify_box").css( "color", foreground );
   $("#notify_box").css( "background-color", background );
   $("#notify_content").html( html );
   g_notify_showtime = Date.now();
}

//-----------------------------------------------------------------------------
// Hide the notification frame. This is linked to the user clicking the box.
// Must be at least 500ms from the show-time to prevent accidental clicks.
let g_notify_showtime = 0;
function HideNotify() {
   if( Date.now() - g_notify_showtime < 500 ) return;
   $("#notify").removeClass( "visible" );
}

//-----------------------------------------------------------------------------
// Show the loading bar. It will start to fill.
function ShowLoading() {
   $("#loadbar_bg").addClass( "active" );
   $("#loadbar_fg").addClass( "active" );
}

//-----------------------------------------------------------------------------
// Hide the loading bar.
function HideLoading() {
   $("#loadbar_bg").removeClass( "active" );
   setTimeout( () => {
      $("#loadbar_fg").removeClass( "active" );
   }, 0.5 );
}

//-----------------------------------------------------------------------------
// Add an auto-resizing script to all textareas on the page.
function addAutoResize() {
   document.querySelectorAll('textarea').forEach( element => {
      element.style.boxSizing = 'border-box';
      let offset = element.offsetHeight - element.clientHeight;
      $(element).on( 'input', event => {
         event.target.style.height = 'auto';
         event.target.style.height = event.target.scrollHeight + offset + 'px';
      });
   });
}

//-----------------------------------------------------------------------------
// Remove all content on the main div, and buttons.
let g_first_header = true;
function ResetContent() {
   g_buttons_enabled = true;
   window.scrollTo( 0, 0 );
   g_first_header = false;
   $("#content_shell").empty();
   $("#buttons").empty();
   
   // First element is the error element. But maybe we should favor
   //  notifications instead.
   $("#content_shell").append( $("<div id='error'></div>") );
}

//-----------------------------------------------------------------------------
// Adds an h2 element with a 'section_desc' para underneath.
function AddContentHeader( title_html, description_html ) {
   let header = $( `<h2>${title_html}</h2>` );
   if( g_first_header ) {
      // This is to remove the margin on the first element.
      g_first_header = false;
      header.addClass( "first" );
   }
   $("#content_shell").append( header );
   $("#content_shell").append(
                       $( `<p class='section_desc'>${description_html}</p>` ));
}

//-----------------------------------------------------------------------------
// Try and load a cached value for a form field.
function LoadFieldsave( element, key ) {
   let saved = localStorage.getItem( "field:" + key );
   if( saved ) {
      element.val( saved );
      //autoResizeText( element );
      setTimeout( () => {element.trigger('input');},0.1 );
   }
}

//-----------------------------------------------------------------------------
// Save a form field to the cache. This is called when the user leaves focus
//  of one of the form inputs.
function UpdateFieldsave( key, val ) {
   localStorage.setItem( "field:" + key, val );
}

//-----------------------------------------------------------------------------
// Add a question to the form, includes the para header as well as a textarea.
// Currently all fields are using textareas.
function AddContentTextPrompt( index, prompt_html ) {
   // Both prompts and inputs have IDs which are form_prompt<index> and
   //  form_input<index>. The prompt ID is used to mark them as required if
   //  the user forgets to fill one out. The other ID is used to fetch the
   //  values for submission.
   $("#content_shell").append(
      `<p class="prompt" id="form_prompt${index}" data-part="${index}">${prompt_html}</p>`
   );
   let textarea = $( `<textarea type="text" value="" rows="1" class="form_input" id="form_input${index}" data-part="${index}"></textarea>` );
   LoadFieldsave( textarea, g_config.parts[index].key );
   $("#content_shell").append( textarea );
}

//-----------------------------------------------------------------------------
// Add the closer text to the submission page. This is just basic html.
function AddCloserText( html ) {
   // Might be kind of weird that we wrap this in a para, and the template
   //  currently has h2 elements.
   let element = $(`<p class="closer_text">${html}</p>`);
   $("#content_shell").append( element );
}

//-----------------------------------------------------------------------------
// Add a button to the bottom of the page and return the new element.
function AddButton( caption ) {
   let button = $( `<div class="bigbutton"><div class="caption">${caption}</div></div>` );
   $("#buttons").append( button );
   return button;
}

//-----------------------------------------------------------------------------
// Main function to show the application page.
function ShowApplication() {
   console.log( "Showing application." );
   ResetContent();
   g_buttons_enabled = true;
   
   // g_config is populated from LoadNormal. It's fetched from the server and
   //  contains the application and other configuration options.
   let form_parts = g_config.parts;
   let firstheader = true;
   
   // Populate the page with the application parts.
   for( let i = 0; i < form_parts.length; i++ ) {
      let part = form_parts[i];
      if( part.type == "section" ) {
         AddContentHeader( part.title, part.description );
      } else if( part.type == "text" ) {
         AddContentTextPrompt( i, part.prompt );
      }
   }
   
   // Add the submit button.
   let submit_button = AddButton( "Submit" )
   submit_button.click( () => {
      
      // Search through the application and make sure that all required fields
      //  are filled. If any are missing, stop with an error.
      $("#error").text( "" );
      $(".prompt").removeClass( "required" );
      
      let post = {};
      
      post.parts = [];
      let has_all_required_fields = true;
      for( let i = 0; i < form_parts.length; i++ ) {
         let part = {};
         for( let j in form_parts[i] ) {
            part[j] = form_parts[i][j];
         }
         
         let element = $("#form_input"+i);
         if( element.length ) {
            part.val = element.val();
            if( part.val.trim() == "" && !part.optional ) {
               has_all_required_fields = false;
               $("#form_prompt"+i).addClass( "required" );
            }
         }
         post.parts.push( part );
      }
      
      if( !has_all_required_fields ) {
         Notify( "Please fill out all of the required fields.",
                 "#c40000", "#fff" );
         return;
      }
      
      // If we have an editcode, then we are UPDATING the app. The editcode
      //  must be valid or the submission will fail. If the admins have
      //  removed edit permission from the app, then it will fail too.
      if( localStorage.getItem( "editcode" )) {
         post.editcode = localStorage.getItem( "editcode" );
      }
      
      // Called when an error occurs:
      // • Server rejects our request (invalid editcode or such).
      // • Can't connect to server or the connection fails.
      // • The server fails to satisfy the request (something wrong on the way
      //   to Google).
      function on_failure() {
         Notify( "Application submission failed. Please try again later. If the problem persists, contact our officers.",
                 "#c60000", "#fff" );
         g_buttons_enabled = true;
      }
      
      // Disable further clicks until the request is done.
      if( !g_buttons_enabled ) return;
      g_buttons_enabled = false;
      
      console.log( "Submitting application to server." );
      ShowLoading();
      $.post({
         url         : "submit.py",
         contentType : "application/json; charset=UTF-8",
         data        : JSON.stringify(post),
         dataType    : "json"
      }).done( data => {
         // Save submission code.
         console.log( "Got OK response." );
         console.log( data );
         if( data.status == 'SUBMITTED' ) {
            console.log( "Submitted successfully." );
            localStorage.setItem( "editcode", data.editcode );
            localStorage.setItem( "appstatus", "" );
            ShowCompleted( true, false );
         } else {
            on_failure();
         }
         
      }).fail( () => {
         console.log( "Operation failed." );
         on_failure();
      }).always( () => {
         HideLoading();
      });
   });
   
   // Register a handler to save updated fields to the local storage.
   $(".form_input").on( "change", event => {
      let element = $(event.target)
      let part = element.data( "part" )
      
      // We use the prompt text as the key. If the application is updated,
      //  then removed prompts will not be used.
      UpdateFieldsave( form_parts[part].key, element.val() );
   });
   
}

//-----------------------------------------------------------------------------
// This is called when the completion page is showed. It requests updated
//  information about the user's application. The rest of the page is loaded
//  from the cache - the "closer text". The application configuration isn't
//                                           loaded for the completion page.
async function CheckApp( load_input ) {
   let post = {
      "editcode": localStorage.getItem( "editcode" )
   }
   
   try {
      let data = await $.post({
         url: "checkapp.py",
         contentType: "application/json; charset=UTF-8",
         data: JSON.stringify(post),
         dataType: "json"
      });
      
      if( data.status == "OK" ) {
         console.log( "App check success." )
         console.log( data );
         if( data.editable ) {
            // If the server tells us that we can edit the app, we add the
            //  button.
            AddButton( "Edit App" ).click( EditAppButton );
         }
         
         if( data.appstatus ) {
            // Officer comments are also stored in this response.
            SetOfficerComments( data.appstatus );
         } else {
            console.log( "No status set." );
            localStorage.setItem( "appstatus", "" );
            if( !data.editable ) {
               SetOfficerComments( "Your application was closed. You may reset this form to submit another one." );
            } else {
               SetOfficerComments( "Your application is under review." );
            }
         }
         
         if( load_input && data.input ) {
            console.log( "Copying input from server." );
            for( let key in data.input ) {
               UpdateFieldsave( key, data.input[key] );
            }
         }
      }
   } catch( err ) {
   }
   
   HideLoading();
   // Could move this elsewhere if we just add the EDIT APP button on the
   //  left side somehow.
   // For some reason it feels more natural to have the edit button on the
   //  left.
   AddButton( "Reset" ).click( ResetButton );
   $("#buttons").removeClass( "hide" );
}

//-----------------------------------------------------------------------------
// Called when the reset button is clicked.
function ResetButton() {
   if( !g_buttons_enabled ) return;
   
   // Ugly confirm box. Prettify in the future?
   if( confirm( "Are you sure?" )) {
      localStorage.clear();
      ShowNormal();
   }
}

//-----------------------------------------------------------------------------
// When the Edit App button is pressed.
function EditAppButton() {
   if( !g_buttons_enabled ) return;
   ShowNormal();
}

//-----------------------------------------------------------------------------
// Update the officer comments div on the page from local storage.
function SetOfficerComments( html ) {
   $("#officer_comments").html( html );
}

//-----------------------------------------------------------------------------
// Shows the "submitted" page.
function ShowCompleted( isnew, load_input ) {
   console.log( "Showing completion page." );
   ResetContent();
   AddCloserText( g_config.closer );
   
   // Add the officer comments section.
   $("#content_shell").append( $(`<h2>Application Status</h2>`) );
   $("#content_shell").append( $(`<p id="officer_comments"><span style="color: rgba(0,0,0,0.25)">Checking...</span></p>`) );
   
   if( !isnew ) {
      CheckApp( load_input );
   } else {
      SetOfficerComments( "Your application is under review" );
      HideLoading();
      // `isnew` is false when they submit a new app. If it's new, there will
      //  be no comments and it should be editable.
      AddButton( "Edit App" ).click( EditAppButton );
      AddButton( "Reset" ).click( ResetButton );
      $("#buttons").removeClass( "hide" );
   }
   
   
   // Fade in.
   $("#content").removeClass( "hide" );
}

//-----------------------------------------------------------------------------
// Load the normal entry page.
function ShowNormal() {
   
   HideLoading();
   ShowApplication();
   
   // Fade in.
   $("#content").removeClass( "hide" )
   $("#buttons").removeClass( "hide" )
      
   addAutoResize();
}

//-----------------------------------------------------------------------------
// Called during startup to read the application template file and configure
//  the pages.
function ParseAppConfiguration( source ) {
   
   // Remove all comment lines from the source (including the newline char).
   source = source.replace( /^#.*$\r?\n?/gm, "" )
   
   let lines = source.split( /\r?\n/ );
   let source_index = 0;
   
   // A few parsing helper functions.
   function fetch() {
      // Will return "" when past the end of the list.
      return lines[source_index++] || "";
   }
   
   function unfetch() {
      // Rewinds to the last line.
      source_index--;
   }
   
   function eof() {
      // Returns true when the reader is past the end.
      return source_index >= lines.length;
   }
   
   // Parts is a special term used throughout the system, meaning parts of the
   //  application.
   let parts  = [];
   
   // The closer text is what is displayed to the user after they submit their
   //  application.
   let closer = "";
   
   function addPart( args, lines ) {
      // Add a new entry to the parts list.
      // `args` are terms parsed from a brackets block like
      //  [SECTION IC_SECTION].
      // `lines` are the text lines that follow the directive.
      let type = args[0].toUpperCase();
      let key  = args[1];
      args.splice( 0, 2 );
      args = args.map( x => x.toUpperCase() );
      
      // Returns true if a certain key is present amongst the arguments.
      function hasArg( key ) {
         return args.indexOf(key) > -1;
      }
      
      // Pretty sure there's a more ES6 way to do this.
      let part = {
         key: key
      }
      
      if( type == "SECTION" ) {
         // This is a section header part.
         part.type  = "section";
         // First line is the title of the section, shows in larger letters.
         part.title = lines[0];
         lines.shift();
         // Following lines make up the description.
         part.description = lines.join( "\n" ).trim();
         parts.push( part );
      } else if( type == "TEXT" ) {
         // This is a text-input part.
         part.type = "text";
         // Join the lines together as the question prompt.
         part.prompt = lines.join( "\n" ).trim();
         
         // If OPTIONAL is present in the directive, then mark this as
         //  optional. Optional doesn't show on the form by default and must
         //  be noted as such in the prompt description (or implied).
         if( hasArg( "OPTIONAL" )) {
            part.optional = true;
         }
         parts.push( part );
      } else if( type == "CLOSER" ) {
         // The closer part is a block of text that is shown to the user when
         //  they submit their application.
         g_config.closer = lines.join( "\n" ).trim();
      }
   }
   
   // To parse the bracketed expressions that mark each part of the
   //  application. [ARG1 ARG2 ARG3 ...]
   let part_regex = /^\s*\[(.+)\]\s*$/;
   
   while( !eof() ) {
      // Search for the next part directive.
      let line = fetch();
      let match = line.match( part_regex );
      if( match ) {
         // Split up the arguments (todo: does this work right if there are
         //  multiple spaces between terms?).
         let args = match[1].split(' ');
         
         let lines2 = [];
         
         // Read the rest of the lines until finding the next part directive or
         //  the end of the file.
         while( !eof() ) {
            let line2 = fetch();
            if( line2.match( part_regex )) {
               unfetch();
               break;
            } else {
               lines2.push( line2 );
            }
         }
         
         addPart( args, lines2 );
      }
   }
   
   g_config.parts = parts;
}

//-----------------------------------------------------------------------------
async function Start() {
   
   // Setup the notify box's dismiss trigger.
   $("#notify_box").click( e => {
      HideNotify();
   });
   ShowLoading();
   
   // If this is set, then the local storage is rewritten with data from the
   //  server upon checking an existing application. This is -undesirable-
   //  if the user has made additional changes locally, so is only set when
   //  they follow an edit link directly (an editcode is present in the
   //  query string).
   let load_input = false;
   
   // Parse the window location and check for an app editcode.
   console.log( window.location );
   let search = window.location.search
   editcode = search.match( /[?&]edit=([a-zA-Z0-9]+)/ );
   if( editcode ) {
      // If the editcode is found, then we link the user's cache to that code,
      //  check their application, and try and load the contents.
      load_input = true;
      editcode = editcode[1].toUpperCase();
      localStorage.setItem( "editcode", editcode );
      
      // REMOVE the editcode from the query string when the page loads. This
      //  is so that if they press reload or whatever, they're not going to
      //  erase their editing progress by refetching the old application
      //  input from the server.
      search = search.replace( /[?&]edit=([a-zA-Z0-9]+)/, "" );
      search = search.replace( /^[?&]/, "?" );
      
      let url = window.location.origin + window.location.pathname + search;
      history.replaceState( null, "", url );
   }
   
   // This is the main application configuration file.
   appdata = await $.get( "app.txt" );
   ParseAppConfiguration( appdata );
   
   if( localStorage.getItem( "editcode" )) {
      // In this path, an editcode is present in the user's cache, meaning they
      //  likely have submitted an application, and want to check the status of
      //  it or edit it. See `load_input` above.
      ShowCompleted( false, load_input );
   } else {
      // In this path, the user is fresh (or they lost their cache data) and
      //  will fill out a new application.
      ShowNormal();
   }
   
}

//-----------------------------------------------------------------------------
// Application entry point. "ready" event.
$( () => {
   // This runs async.
   Start();
})

///////////////////////////////////////////////////////////////////////////////
