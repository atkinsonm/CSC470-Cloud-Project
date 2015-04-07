// Test if array values are email addresses; remove otherwise
exports.validateEmailAddr = function(emails) {
    var Regex = require("regex");
    var pattern = new Regex(/[a-zA-Z]*/);
    var res;
    for (var i = 0; i < emails.length; i++) {
        // Test against regex
        console.log("Testing " + emails[i]);
        res  = pattern.test(emails[i]);
        // Remove if false
        if (!res) {
            console.log("Removing " + emails[i]);
            emails.splice(i, 1);
            i--; 
        }
    }
    return emails;
}