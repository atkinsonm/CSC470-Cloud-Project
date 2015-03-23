var AWS = require('aws-sdk');
var ses = new AWS.SES();
var charset = "utf-8";

var params = {
  Destination: { /* required */
    BccAddresses: [
      /* more items */
    ],
    CcAddresses: [
      /* more items */
    ],
    ToAddresses: [
      array
      /* more items */
    ]
  },
  Message: { /* required */
    Body: { /* required */
      Html: {
        Data: '5', /* required */
        Charset: charset
      },
      Text: {
        Data: 'Blah blah invited you to a conference. Click this link to access the conference', /* required */
        Charset: charset
      }
    },
    Subject: { /* required */
      Data: 'You\'ve been invited to join a conference', /* required */
      Charset: charset
    }
  },
  Source: '', /* required */
  ReplyToAddresses: [

    /* more items */
  ],
  ReturnPath: ''
};

ses.sendEmail(params, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});
