
export class SearchStrategy {
  async execute({ req, user }) {
    throw new Error("execute method must be implemented by subclass");
  }
}

