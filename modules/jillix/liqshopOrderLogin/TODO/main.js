define(["./jquery.min"], function() {

    var self;

    var userInput, passInput;

    function init(config) {

        self = this;

        userInput = $("#pub", self.dom);
        passInput = $("#pwd", self.dom);

        $("#btn", self.dom).click(function() {

            var user = userInput.val();
            var pass = passInput.val();

            login(user, pass);
            return false;
        });
    }


    function login(user, pass) {

        N.login(user, pass, function(err, ok) {

            if (err) {
                $(".error", self.dom).text(err).show();
                passInput.val("");
                userInput.focus().select();
                return;
            }

            window.location.reload();
        });
    }

    return init;
});

