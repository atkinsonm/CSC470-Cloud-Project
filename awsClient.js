var AWS = require('aws-sdk'),
    fs = require('fs'),
    Files = {};

// Set the region for the AWS services - required for DynamoDB
AWS.config.update({region: "us-east-1"});

// Create clients for each service
var s3 = new AWS.S3();
var dynamodb = new AWS.DynamoDB();
var ses = new AWS.SES();

var charset = "utf-8";

// Creates a new bucket for a room
exports.createBucket = function(roomID) {
    var name = 'tcnj-csc470-nodejs-' + roomID;

    var params = {
        Bucket: name,
        ACL: 'public-read'
    };

    s3.createBucket(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });
}

exports.addRoomToDB = function(roomName, roomID) {

    var params = {
        Item: {
            RoomID: { S: roomID },
            RoomName: { S: roomName }
        },
        TableName: "Room"
    };

    dynamodb.putItem(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
    });

}

// Generates a random room ID string
exports.randID = function(sendTo, instructor)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

exports.sendEmail = function() {
    var charset = "utf-8";

    var params = {
      Destination: { /* required */
        ToAddresses: sendTo
      },
      Message: { /* required */
        Body: { /* required */
          Html: {
            Data: '5', /* required */
            Charset: charset
          },
          Text: {
            Data: instructor + ' invited you to a conference. Click this link to access the conference', /* required */
            Charset: charset
          }
        },
        Subject: { /* required */
          Data: 'You\'ve been invited to join a conference!', /* required */
          Charset: charset
        }
      },
      Source: 'melusom2@tcnj.edu'//, /* required */
      //ReplyToAddresses: '',
      //ReturnPath: ''
    };

    ses.sendEmail(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });   
}


// Save a temporarily file.
exports.saveTemporaryFile = function(file)
{
  
  // if tmp directory is not already created, then create it.
  fs.exists(__dirname + "/tmp", function (exists) {
    if (!exists) {
      fs.mkdir(__dirname + "/tmp", function (e) {
          if (!e) {
              console.log("Created tmp directory without errors.");
          } else {
              console.log("Exception while creating tmp directory....");
              throw e;
          }
      });
    } 
  });

  var currentTimeStamp = Date.now();
  var fileName = file['name'] + '.' + file['extension'];
  var fileData = this.decodeDataURL(file['data']).data;

  // save the temp file.
  fs.writeFile(__dirname + "/tmp/" + fileName, fileData, function (err) {
     if (err) console.log(err, err.stack); // an error occurred
        else     console.log('Temporary file saved.');           // successful response
  });
}

// Decode a dataURL format for Blob files to array with file type and Base64 encode data.
exports.decodeDataURL = function(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};
    
    if (matches.length !== 3) {
        return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');

    return response;
}


exports.uploadObjectToBucket = function(bucket, key, objectPath)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}