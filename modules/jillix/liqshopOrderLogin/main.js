define(["./jquery.min"], function() {

    var self;

    var userInput, passInput;

    function init() {

        self = this;

        userInput = $("#pub");
        passInput = $("#pwd");

        $("#btn").click(function() {

            var user = userInput.val();
            var pass = passInput.val();

            login(user, pass);
            return false;
        });
    }


    function login(user, pass) {

        self.link("login", { data: { user: user, pass: pass } },  function(err, ok) {

            if (err) {
                passInput.val("");
                userInput.focus().select();
                return;
            }

            alert(ok);

        });
    }

    return {
        init: init    
    };

});

