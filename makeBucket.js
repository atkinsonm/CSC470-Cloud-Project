function randid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

var AWS = require('aws-sdk');

var s3 = new AWS.S3();

var name = randid();

 s3.createBucket({Bucket: name}, function() {

  var params = {Bucket: name, Key: 'myKey', Body: 'Hello!'};

  s3.putObject(params, function(err, data) {

      if (err)

          console.log(err)

      else       console.log("Successfully uploaded data to " + name + "/myKey");

   });

});
