///////////////////////////////////////////////////////////////////////////////
// TFRAPP by Potter-MoonGuard (c) 2020
console.log( "Hello happy developer! :)" );
console.log( "This happy code brought to you by Potter-MoonGuard." );
console.log( "Minifying is for nerds." );

var g_config;
var g_buttons_enabled = true;
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
var g_notify_showtime = 0;
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
//var viewtime = parseInt(localStorage.getItem( "viewtime" ));
//if( viewtime && Date.now() > viewtime + 30*24*60*60*1000 ) {
//   localStorage.clear();/
//}
/*
//-----------------------------------------------------------------------------
var fieldsave = localStorage.getItem( "fieldsave" ) || {};
fieldsave.values = fieldsave.values || {};
if( fieldsave.time && Date.now() > fieldsave.time + 30*24*60*60*1000 ) {
   fieldsave.values = {};
}

//-----------------------------------------------------------------------------
function GetFieldsave( key ) {
   if( fieldsave.values[key] ) {
      return fieldsave.values[key];
   } else {
      return "";
   }
}

//-----------------------------------------------------------------------------
function UpdateFieldsave( key, value ) {
   fieldsave.values[key] = value;
   window.localStorage.setItem( "fieldsave", fieldsave );
}*/

//-----------------------------------------------------------------------------
// Add an auto-resizing script to all textareas on the page.
function addAutoResize() {
   document.querySelectorAll('textarea').forEach( element => {
      element.style.boxSizing = 'border-box';
      var offset = element.offsetHeight - element.clientHeight;
      $(element).on( 'input', event => {
         event.target.style.height = 'auto';
         event.target.style.height = event.target.scrollHeight + offset + 'px';
      });
   });
}

//-----------------------------------------------------------------------------
// Remove all content on the main div, and buttons.
var g_first_header = true;
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
   var header = $( `<h2>${title_html}</h2>` );
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
   var saved = localStorage.getItem( "field:" + key );
   if( saved ) {
      element.val( saved );
      //autoResizeText( element );
      setTimeout( () => {element.trigger('input');},0.1 );
   }
}

//-----------------------------------------------------------------------------
// Save a form field to the cache. This is called when the user leaves focus
//  of one of the form inputs.
function UpdateFieldsave( element, key ) {
   localStorage.setItem( "field:" + key, element.val() );
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
   var textarea = $( `<textarea type="text" value="" rows="1" class="form_input" id="form_input${index}" data-part="${index}"></textarea>` );
   LoadFieldsave( textarea, prompt_html );
   $("#content_shell").append( textarea );
}

//-----------------------------------------------------------------------------
// Add the closer text to the submission page. This is just basic html.
function AddCloserText( html ) {
   // Might be kind of weird that we wrap this in a para, and the template
   //  currently has h2 elements.
   var element = $(`<p class="closer_text">${html}</p>`);
   $("#content_shell").append( element );
}

//-----------------------------------------------------------------------------
// Add a button to the bottom of the page and return the new element.
function AddButton( caption ) {
   var button = $( `<div class="bigbutton"><div class="caption">${caption}</div></div>` );
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
   var form_parts = g_config.parts;
   var firstheader = true;
   
   // Populate the page with the application parts.
   for( var i = 0; i < form_parts.length; i++ ) {
      var part = form_parts[i];
      if( part.type == "header" ) {
         AddContentHeader( part.title, part.description );
      } else if( part.type == "text" ) {
         AddContentTextPrompt( i, part.prompt );
      }
   }
   
   // Add the submit button.
   var submit_button = AddButton( "Submit" )
   submit_button.click( () => {
      
      // Search through the application and make sure that all required fields
      //  are filled. If any are missing, stop with an error.
      $("#error").text( "" );
      $(".prompt").removeClass( "required" );
      
      var post = {};
      
      post.parts = [];
      var has_all_required_fields = true;
      for( var i = 0; i < form_parts.length; i++ ) {
         var part = {};
         for( var j in form_parts[i] ) {
            part[j] = form_parts[i][j];
         }
         
         var element = $("#form_input"+i);
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
         url: "submit.py",
         contentType: "application/json; charset=UTF-8",
         data: JSON.stringify(post),
         dataType: "json"
      }).done( data => {
         // Save submission code.
         console.log( "Got OK response." );
         console.log( data );
         if( data.status == 'SUBMITTED' ) {
            console.log( "Submitted successfully." );
            localStorage.setItem( "editcode", data.editcode );
            localStorage.setItem( "post", "" );
            ShowCompleted( true );
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
   $(".form_input").change( event => {
      var element = $(event.target)
      var part = element.data( "part" )
      
      // We use the prompt text as the key. If the application is updated,
      //  then removed prompts will not be used.
      UpdateFieldsave( element, form_parts[part].prompt );
   })
}

//-----------------------------------------------------------------------------
// This is called when the completion page is showed. It requests updated
//  information about the user's application. The rest of the page is loaded
//  from the cache - the "closer text". The application configuration isn't
//                                           loaded for the completion page.
function CheckApp() {
   var post = {
      "editcode": localStorage.getItem( "editcode" )
   }
   $.post({
      url: "checkapp.py",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify(post),
      dataType: "json"
   }).done( data => {
      if( data.status == "OK" ) {
         if( data.editable ) {
            // If the server tells us that we can edit the app, we add the
            //  button.
            AddButton( "Edit App" ).click( EditAppButton );
            if( data.post ) {
               // Officer comments are also stored in this response.
               localStorage.setItem( "officer_comments", data.post );
               UpdateOfficerComments();
            }
         }
      } else {
      
      }
   }).fail( () => {
      // Don't need to do anything special. The user will retain the cached
      //  data to display.
   }).always( () => {
      // Could move this elsewhere if we just add the EDIT APP button on the
      //  left side somehow.
      // For some reason it feels more natural to have the edit button on the
      //  left.
      AddButton( "Reset" ).click( ResetButton );
      $("#buttons").removeClass( "hide" );
   })
}

//-----------------------------------------------------------------------------
// Called when the reset button is clicked.
function ResetButton() {
   if( !g_buttons_enabled ) return;
   
   // Ugly confirm box. Prettify in the future?
   if( confirm( "Are you sure?" )) {
      localStorage.clear();
      LoadNormal();
   }
}

//-----------------------------------------------------------------------------
// When the Edit App button is pressed.
function EditAppButton() {
   if( !g_buttons_enabled ) return;
   LoadNormal();
}

//-----------------------------------------------------------------------------
// Update the officer comments div on the page from local storage.
function UpdateOfficerComments() {
   $("#officer_comments").html(
      localStorage.getItem( "officer_comments" )
      || "No comments have been made on your application."
   );
}

//-----------------------------------------------------------------------------
// Shows the "submitted" page.
function ShowCompleted( isnew ) {
   console.log( "Showing completion page." )
   HideLoading();
   ResetContent();
   AddCloserText( localStorage.getItem( "closer_text" ));
   
   if( !isnew ) {
      CheckApp();
   } else {
      // `isnew` is false when they submit a new app. If it's new, there will
      //  be no comments and it should be editable.
      AddButton( "Edit App" ).click( EditAppButton );
      AddButton( "Reset" ).click( ResetButton );
      $("#buttons").removeClass( "hide" );
   }
   
   // Add the officer comments section.
   $("#content_shell").append( $(`<h2>Officer Comments</h2>`) );
   $("#content_shell").append( $(`<p id="officer_comments"></p>`) );
   UpdateOfficerComments();
   
   // Fade in.
   $("#content").removeClass( "hide" );
}

//-----------------------------------------------------------------------------
// Load the normal entry page.
function LoadNormal() {
   ShowLoading();
   
   // We fetch the configuration from the server, and then go from there.
   $.get( "getconfig.py" ).done( data => {
      HideLoading();
      g_config = data;
      
      // Closer text from this response is saved in the cache for the
      //  completion page. It's not loaded later for the completion page, as
      //  the cache needs to be valid for that page (must contain an editcode).
      localStorage.setItem( "closer_text", g_config.closer_text );
      ShowApplication();
      
      // Fade in.
      $("#content").removeClass( "hide" )
      $("#buttons").removeClass( "hide" )
      
      addAutoResize();
   }).fail( ( error ) => {
      HideLoading();
      console.log( error );
      Notify( "The server is experiencing problems. Please try again later.",
              "#c40000", "#fff" );
      return;
   });
}

//-----------------------------------------------------------------------------
// Application entry point. "ready" event.
$( () => {
   // Setup the notify box's dismiss trigger.
   $("#notify_box").click( () => {
      HideNotify();
   })
   
   // The editcode is what we use to keep track of our application submission,
   //  generated from the server and returned in the response from the submit
   //  API. The submit API also accepts an editcode to try and edit an app
   //  instead of creating a new one.
   // If we have an editcode, start with the completion page instead of the
   //  normal page.
   if( localStorage.getItem( "editcode" )) {
      ShowCompleted();
   } else {
      ShowLoading();
      LoadNormal();
   }
})

///////////////////////////////////////////////////////////////////////////////
