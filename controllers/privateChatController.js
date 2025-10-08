export async function getPrivateMessages(req, res, next) {
  // Req parameters:
  // Sender, Receiver (UID)
  // Res:
  // A list of private Messages
}

export async function sendPrivateMessage(req, res, next) {
  // Req parameters:
  // Sender, Receiver (UID)
  // Message Text, Timestamp
  // Sender Status (retrieved from user)
  // Res:
  // void with Status code
  // 201: "Message sent successfully"
  // 500: "Internal server error: Unable to create new private message to channel."
}

// TODO: push new msg to receiver via socket.io
export async function sendNewPrivateMsgNotification(req, res, next) {
  // Req parameters:
  // Sender, Receiver (UID)
  // Message text (for 'elect to view'), Timestamp (for 'You received a msg XXX minutes ago')
  // Sender status (available alongside msg content when viewed)
  // Res:
  // Sender, Receiver (UID)
  // Message text (for 'elect to view'), Timestamp (for 'You received a msg XXX minutes ago')
  // Sender status (available alongside msg content when viewed)
}
