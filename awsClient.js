var AWS = require('aws-sdk'),
    fs = require('fs'),
    dataUriToBuffer = require('data-uri-to-buffer'),
    Files = {};

// Set the region for the AWS services - required for DynamoDB
AWS.config.update({region: "us-east-1"});

// Create clients for each service
var s3 = new AWS.S3();
var dynamodb = new AWS.DynamoDB();
var ses = new AWS.SES();
var sqs = new AWS.SQS();
var aws = this;
var sns = new AWS.SNS();

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

exports.sendEmail = function(sendTo, instructor, roomID, callback, externalIP) {
    var charset = "utf-8";

    console.log(sendTo);

    var params = {
      Destination: {
        ToAddresses: ['davincinode@gmail.com'],
        BccAddresses: sendTo
      },
      Message: {
        Body: {
          Html: {
            Data: instructor + ' invited you to a workshop. Your workshop ID number is ' + roomID + '. Click this link to join the room http://' + externalIP + ':3000/room/a/' + roomID,
            Charset: charset
          },
          Text: {
            Data: instructor + ' invited you to a workshop. Your workshop ID number is ' + roomID + '. Click this link to join the room http://' + externalIP + ':3000/room/a/' + roomID,
            Charset: charset
          }
        },
        Subject: {
          Data: 'You\'ve been invited to join a workshop!',
          Charset: charset
        }
      },
      Source: 'davincinode@gmail.com',
      ReturnPath: 'davincinode@gmail.com'
    };

    ses.sendEmail(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
      
      callback(err, data, "complete-emails");
    });   
}


// Save a temporarily file.
exports.uploadFileToS3Bucket = function(roomID, file)
{
  var bucketName = 'tcnj-csc470-nodejs-' + roomID;
  var fileName = file['name'] + '.' + file['extension'];
  var file = dataUriToBuffer(file['data']);
  
  var params = {
      Bucket: bucketName,
      Key: fileName,
      ACL: 'public-read',
      Body: file,
      ContentType: file.type

  };

  s3.putObject(params, function(err, data) {
    if (err) {
      console.log("File upload failed");
      console.log(err, err.stack); // an error occurred
    }
    else {
      console.log("File uploaded into bucket.")
      console.log(data); // successful response  
    }
  });
}

exports.listObjects = function(roomID, callback)
{
    var bucketName = 'tcnj-csc470-nodejs-' + roomID;
    
    var params = {
      Bucket: bucketName, /* required */
      Delimiter: ',',
      EncodingType: 'url'
    };
    
    s3.listObjects(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else  callback(err, data["Contents"]); // successful response
    });
}

//Sends a message to the Admin to alert to the creation of the room
exports.publish = function(){
    var params = {
    Message: 'A new room has been created.', /* required */
    TopicArn: 'arn:aws:sns:us-east-1:479279233454:DaVinciNode'
  };

  sns.publish(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

// Create a queue on SQS service.
exports.createQueueSQS = function(roomID, callback) {

  var name = 'tcnj-csc470-nodejs-' + roomID;

  var params = {
    QueueName: name, /* required */
    Attributes: {
      ReceiveMessageWaitTimeSeconds: '20',
    },
  };
  
  sqs.createQueue(params, function(err, data) {
    if (err) {
      console.log("Queue creation failed.");
      console.log(err, err.stack); // an error occurred
    }
    else {
      console.log(data); // successful response  
    }

    callback(err, data);
  });
}

// log the chat history on a SQS queue of a specific room.
exports.logChatHistory = function(roomID, message) {

  var queueURL;

  // callback for getQueueURLSQS.
  function getQueueURLSQSCallback(err, data) {
    if (!err) {
      queueURL = data.QueueUrl;
      aws.sendMessageSQS(queueURL, message);
    }
  }

  // recovering the queue URL.
  this.getQueueURLSQS(roomID, getQueueURLSQSCallback);
}

// recover the queue URL on SQS for a specific queue name.
exports.getQueueURLSQS = function(roomID, callback) {
  var name = 'tcnj-csc470-nodejs-' + roomID;
  
  var params = {
    QueueName: name, /* required */
  };

  var queueURL;

  sqs.getQueueUrl(params, function(err, data) {
    if (err) {
      console.log("Queue do not exist");
    }
    else {
      console.log(data);           // successful response
    } 

    callback(err, data);
  });
}

// send a new message to a queue on SQS.
exports.sendMessageSQS = function(queueURL, message) {
  
  var params = {
    MessageBody: JSON.stringify(message), /* required */
    QueueUrl: queueURL, /* required */
    DelaySeconds: 0,
  };

  sqs.sendMessage(params, function(err, data) {
    if (err) {
      console.log("Message cannot be sent to queue.")
      console.log(err, err.stack); // an error occurred
    }
    else     console.log(data);           // successful response
  });
}

// this function recover the room chat history from SQS.
exports.recoverChatHistorySQS = function(roomID, callback) {

  var queueURL;

  // callback for getQueueURLSQS.
  function getQueueURLSQSCallback(err, data) {
    if (!err) {
      queueURL = data.QueueUrl;
      aws.receiveMessagesSQS(queueURL, callback);
    }
  }

  // recovering the queue URL.
  this.getQueueURLSQS(roomID, getQueueURLSQSCallback);
}

// recover all messages from a queue on SQS.
exports.receiveMessagesSQS = function(queueURL, callback) {
  
  var params = {
    QueueUrl: queueURL, /* required */
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 0,
    WaitTimeSeconds: 0,
  };

  sqs.receiveMessage(params, function(err, data) {
    if (err) {
      console.log("Messages cannot be recovered.")
      console.log(err, err.stack); // an error occurred
    }
    else     console.log(data);           // successful response

    callback(err, data);
  });
}