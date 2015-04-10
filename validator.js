// Validate the file necessary received data.
exports.validateFile = function(file) {
    var valid = true;

    if (file != undefined) {
        if (file.name == undefined || file.name == "") {
            valid = false;
        }
        if (file.extension == undefined || file.extension == "") {
            valid = false;
        }
        if (file.data == undefined || file.data == "") {
            valid = false;
        }   
        
        if (!valid) {
            console.log('File corrupted.');
            return false;
        } 

        return file;

    } else { return false; }
}