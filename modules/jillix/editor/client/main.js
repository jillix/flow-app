define(["jillix/ace/ace", "jillix/ace/mode/javascript", "jillix/ace/theme/textmate"], function(ace, jsMode, theme) {
    
    //status
    var cssNs = "div.editor ",
        docName = "",
        unsavedChanges = 0,
        saving = false,
        statusText = [
        
            "Document has changed",
            "Document is saving...",
            "All changes saved",
            "An Error occurred while saving, please try again"
        ],
        
        //document references
        save        = N.dom.findOne(cssNs + "ul#bar li#save"),
        status      = N.dom.findOne(cssNs + "ul#bar li#status"),
        settings    = N.dom.findOne(cssNs + "div#settings"),
        aceWrapper  = N.dom.findOne(cssNs + "div#aceWrapper"),
        openSettings = N.dom.findOne("#openSettings");
    
    //set initial status text
    if (status) {
        
        status.innerHTML = statusText[2];
    }
    
    //check status before window close
    window.onbeforeunload = function() {
        
        if (unsavedChanges == 1) {
            
            return "Your changes are not saved!";
        }
        
        if (unsavedChanges == 2) {
             
            return "Please wait till document is saved!";
        }
    };
    
    //show/hide editor settings
    if (openSettings) {
    
        openSettings.addEventListener("click", function() {
            
            if (settings.getAttribute("class") == "open") {
                
                aceWrapper.removeAttribute("class");
                settings.removeAttribute("class");
            }
            else {
                
                aceWrapper.setAttribute("class", "lean");
                settings.setAttribute("class", "open");
            }
        });
    }
    
    function saveDocument(value) {
                
        if(unsavedChanges == 1 && !saving) {
            
            saving = true;
            unsavedChanges = 2;
            status.innerHTML = statusText[1];
            
            // !TODO: save document
            setTimeout(function(err) {
                
                if (err) {
                    
                    unsavedChanges = 1;
                    status.innerHTML = statusText[3];
                }
                else if (unsavedChanges == 2) {
                    
                    unsavedChanges = 0;
                    status.innerHTML = statusText[2];
                    document.title = docName;
                }
                
                saving = false;
                
            }, 500);
        }
    }
    
    return {
        
        init: function(config) {
            
            //temp config
            config = {
                
                docName: "N.js"
            };
            
            //set document title
            document.title = docName = config.docName;
            
            var editor = ace.edit("ace"),
                session = editor.getSession();
            
            //setup editor
            editor.setTheme("ace/theme/textmate");
            session.setMode(new jsMode.Mode());
            session.on("change", function() {
                
                unsavedChanges = 1;
                status.innerHTML = statusText[0];
                document.title = "*" + docName;
            });
            
            //add ctrl-s command
            editor.commands.addCommand({
            
                name: "save",
                bindKey: {
                
                    win: "Ctrl-S",
                    mac: "Command-S",
                    sender: "editor"
                },
                exec: saveDocument
            });
            
            //handle save button
            save.addEventListener("click", saveDocument);
            
            // !TODO: settings
            // !TODO: minify js with google closure compiler via REST API
        }
    };
});