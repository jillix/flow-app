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

        N.login(user, pass, function(err, ok) {

            if (err) {
                $(".error").text(err).show();
                passInput.val("");
                userInput.focus().select();
                return;
            }

            window.location.reload();
        });
    }

    return {
        init: init    
    };

});

