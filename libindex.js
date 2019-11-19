var aws = require('aws-sdk');

function createLib(execlib, messengerbaselib){
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    MailerBase = messengerbaselib.MessengerBase,
    analyzeBounce = require('./bounceanalyzercreator')(execlib),
    analyzeComplaint = require('./complaintanalyzercreator')(execlib);

  function AWSMailer(config){
    MailerBase.call(this, config);
    this.sender = new aws.SES({
			apiVersion: config.apiVersion || '2010-12-01',
      region: config.region || 'us-east-1'
    });
    if (config.starteddefer) {
      config.starteddefer.resolve(this);
    }
  }
  lib.inherit(AWSMailer, MailerBase);
  AWSMailer.prototype.destroy = function(){
    this.sender = null;
    MailerBase.prototype.destroy.call(this);
  };

  AWSMailer.prototype.commitSingleMessage = function(params){
    var sendObj = {};
    if (!this.sender){
      console.log('Mail sender is already destroyed');
      return q(false);
    }
    sendObj.Source = params.from;
    sendObj.Destination = {};
    sendObj.Destination.ToAddresses = [];
    sendObj.Destination.ToAddresses.push(params.to);
    sendObj.Message = {};
    sendObj.Message.Body = {};
    if (!!params.text){
      sendObj.Message.Body.Text = {
        Charset: 'UTF-8',
        Data: params.text
      }
    }
    if (!!params.html){
      sendObj.Message.Body.Html = {
        Charset: 'UTF-8',
        Data: params.html
      }
    }
    sendObj.Message.Subject = {
      Charset: 'UTF-8',
      Data: params.subject
    }

    //console.log('oli sendEmail?', require('util').inspect(sendObj, {depth: 8, colors:true}));
    return this.sender.sendEmail(sendObj).promise();
  };

  AWSMailer.prototype.messageIdFromCommitResponse = function (sendingsystemresponse) {
    return sendingsystemresponse.MessageId;
  };
  AWSMailer.prototype.paramsFromDeliveryNotification = function (sendingsystemdeliverynotification) {
    if (!sendingsystemdeliverynotification) {
      throw new lib.Error('NO_DELIVERY_NOTIFICATION', 'No delivery notification provided');
    }
    if ('Delivery' !== sendingsystemdeliverynotification.notificationType) {
      throw new lib.Error('WRONG_NOTIFICATION_TYPE', sendingsystemdeliverynotification.notificationType+ ' <> Delivery');
    }
    return {
      sendingsystemid: sendingsystemdeliverynotification.mail.messageId,
      sendingsystemnotified: new Date(sendingsystemdeliverynotification.delivery.timestamp).valueOf()
    };
  };
  AWSMailer.prototype.paramsFromBounceNotification = function (sendingsystembouncenotification) {
    return analyzeBounce(sendingsystembouncenotification, this);
  };
  AWSMailer.prototype.paramsFromComplaintNotification = function (sendingsystemcomplaintnotification) {
    return analyzeComplaint(sendingsystemcomplaintnotification);
  };
  AWSMailer.prototype.sendingsystemcode = 'aws';
  AWSMailer.addMethodsToNotifier = function (klass) {
    MailerBase.addMethodsToNotifier(klass, AWSMailer);
  };

  return {
    mailer: AWSMailer
  }
}

module.exports = createLib;
