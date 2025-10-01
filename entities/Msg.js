class Msg {
  constructor({ id, sender, receiver, timestamp, status, content }) {
    this.id = id;
    this.sender = sender;
    this.receiver = receiver;
    this.timestamp = timestamp;
    this.status = status;
    this.content = content;
  }

  isPublic() {
    return this.receiver === "public";
  }

  isPrivate() {
    return this.receiver !== "public";
  }
}

export default Msg;