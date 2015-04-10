// Test if array values are email addresses; remove otherwise
function validateEmailAddr() {
    var emails = document.getElementById("emailsinput").value;
    emails = emails.split(",");
    var errors = new Array();
    var results = new Array();
    for (var i = 0; i < emails.length; i++) {
        results.push(emails[i].match(/([a-z]|[0-9])([a-z]|[0-9]|_)+@([a-z]|[0-9]|_)+\.[a-z]+/ig));
        if (emails[i].match(/([a-z]|[0-9])([a-z]|[0-9]|_)+@([a-z]|[0-9]|_)+\.[a-z]+/ig) == null) { errors.push(emails[i]); } 
    }
    var textarea = document.getElementById("emailsinput");
    results = results.join();
    if (results.charAt(results.length-1) === ',') { results = results.substring(0, results.length-2); }
    textarea.value = results;
    alert("These values are not valid email addresses: " + errors);
}