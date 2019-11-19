function createComplaintAnalyzer (execlib) {
  'use strict';

  var lib = execlib.lib;

  function blacklistAddresser (res, obj) {
    if (!obj) {
      return res;
    }
    if (!obj.emailAddress) {
      return res;
    }
    res.push({recipient: obj.emailAddress, reason: 'complained'});
    return res;
  }

  function maybeToBlacklist (complaintmsg, ret) {
    if (!complaintmsg) {
      return;
    }
    if (complaintmsg.notificationType !== 'Complaint') {
      return;
    }
    if (!complaintmsg.complaint) {
      return;
    }
    if (!lib.isArray(complaintmsg.complaint.complainedRecipients)) {
      return;
    }
    ret.toblacklist = complaintmsg.complaint.complainedRecipients.reduce(blacklistAddresser, []);
  }

  function analyzeComplaint (complaint, meessenger) {
    var ret;
    if (!complaint) {
      throw new lib.Error('NO_COMPLAINT_NOTIFICATION', 'No delivery notification provided');
    }
    if ('Complaint' !== complaint.notificationType) {
      throw new lib.Error('WRONG_NOTIFICATION_TYPE', complaint.notificationType+ ' <> Complaint');
    }
    ret =  {
      sendingsystemid: complaint.mail.messageId,
      sendingsystemnotified: new Date(complaint.complaint.timestamp).valueOf(),
      toblacklist: []
    };
    maybeToBlacklist(complaint, ret);
    return ret;
  }

  return analyzeComplaint;
}
module.exports = createComplaintAnalyzer;
