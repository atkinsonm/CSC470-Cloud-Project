var AWS = require('aws-sdk'),
    wait = require("wait.for");

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

    dynamodb.getItem(params, function(err, data){
        if (err){ 
            console.log(err, err.stack);
            callback(false);
        }
        else {
            callback(typeof data.Item === "undefined");
        }
    });

    console.log("Got here");
    return result;

}

exports.getUniqueRoomID = function() {

    var roomID = this.randID();

    var params = {
        Key: {
            RoomID: { S: roomID }
        },
        TableName: "Room"
    };

    console.log("getting item");

    dynamodb.getItem(params, function(err, data){
        if (err) console.log(err, err.stack);
        else {
            console.log("Finished dynamodb call for " + roomID);
            if(typeof data.Item === "undefined") {
                console.log("Returning unique ID");
                return roomID;
            }
            else
                this.getUniqueRoomID();
        }
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
exports.randID = function()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}