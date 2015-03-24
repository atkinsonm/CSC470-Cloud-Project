$(document).ready(function(){

    var AWS = require('aws-sdk');

    var s3 = new AWS.S3();

    var name = 'tcnj-csc470-nodejs-' + randID();
    
    var params = {
        Bucket: name,
        ACL: 'public-read',
        
    };

    s3.createBucket(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
});

function randID()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
