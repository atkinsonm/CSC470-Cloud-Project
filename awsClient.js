var AWS = require('aws-sdk');

// Set the region for the AWS services - required for DynamoDB
AWS.config.update({region: "us-east-1"});

// Create clients for each service
var s3 = new AWS.S3();
var dynamodb = new AWS.DynamoDB();
var ses = new AWS.SES();

// Creates a new bucket for a room
exports.createBucket = function(roomID, callback) {
    var name = 'tcnj-csc470-nodejs-' + roomID;

    var params = {
        Bucket: name,
        ACL: 'public-read'
    };

    s3.createBucket(params, function(err, data) {
      if (err) {
        console.log("Bucket creation failed");
        console.log(err, err.stack); // an error occurred
      }
      else     console.log(data); // successful response

      callback(err, data);
    });
    return name;
}

// Deletes an AWS bucket and all objects it contains
exports.deleteBucket = function(roomID, callback) {
    var name = 'tcnj-csc470-nodejs-' + roomID;
    
    var params = {
        Bucket: 'STRING_VALUE' /* required */
    };
    
    s3.deleteBucket(params, function(err, data) {
      if (err) {
          console.log("Bucket creation failed");
          console.log(err, err.stack); // an error occurred
      }
      else     console.log(data);      // successful response
        
        callback(err, data);
    });
}

/*
 * Queries DynamoDB to see whether the room ID given in the parameter has been used already
 * If the room ID is unique, then a true value is passed into the parameter callback
 * If the room ID is not unique, then a false value is passed into the parameter callback
 */
exports.testRoomID = function(roomID, callback) {

    var result;

    var params = {
        Key: {
            RoomID: { S: roomID }
        },
        TableName: "Room"
    };

    dynamodb.getItem(params, function(err, data) {
        if (err){ 
            console.log(err, err.stack);
            callback(false);
        }
        else {
            callback(typeof data.Item === "undefined");
        }
    });

}

exports.addRoomToDB = function(roomName, roomID, callback) {

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
      callback(err, data);
    });
}

exports.deleteRoomFromDB = function(roomName, roomID, callback) {
    var params = {
        Item: {
            RoomID: { S: roomID },
            RoomName: { S: roomName }
        },
        TableName: "Room"
    };

    dynamodb.deleteItem(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
      callback(err, data);
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

exports.sendEmail = function(sendTo, instructor, callback) {
    var charset = "utf-8";

    var params = {
      Destination: { /* required */
        BccAddresses: sendTo
      },
      Message: { /* required */
        Body: { /* required */
          Html: {
            Data: instructor + ' invited you to a conference. Click this link to access the conference', /* required */
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
      Source: 'gottlob1@tcnj.edu', /* required */
      //ReplyToAddresses: '',
      ReturnPath: 'gottlob1@tcnj.edu'
    };

    ses.sendEmail(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
      
      callback(err, data, "complete-emails");
    });   
}