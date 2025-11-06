export class SearchStrategy {
  constructor(strategies = undefined) {
    this.strategies = strategies;
  }

  async execute({ req, user }) {
    throw new Error("execute method must be implemented by subclass");
  }

  selectStrategy(type) {
    if (!this.strategies) {
      throw new Error("SearchStrategy must be instantiated with strategies to use selectStrategy");
    }

    const normalizedType = String(type || "").trim();
    const strategy = this.strategies[normalizedType];
    
    if (!strategy) {
      return null;
    }

    if (!(strategy instanceof SearchStrategy)) {
      throw new Error("Invalid strategy implementation");
    }

    return strategy;
  }

  async executeSearch(type, params) {
    const strategy = this.selectStrategy(type);
    
    if (!strategy) {
      return { code: 400, error: `Unsupported type: ${type}` };
    }

    return await strategy.execute(params);
  }
}
