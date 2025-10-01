class User {
  constructor({ id, username, sharedstatus, status, role, createdAt }) {
    this.id = id;
    this.username = username;
    this.sharedstatus = sharedstatus;
    this.status = status;
    this.role = role;
    this.createdAt = createdAt;
    
  }

  isActive() {
    return this.status === "active";
  }

  isAdmin() {
    return this.role === "admin";
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      sharedstatus: this.sharedstatus,
      status: this.status,
      role: this.role,
    };
  }

}

export default User;
