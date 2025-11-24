import { citizensByUsernameStrategy } from "../services/search/citizensByUsernameStrategy.js";
import { citizensByStatusStrategy }   from "../services/search/citizensByStatusStrategy.js";
import { announcementsStrategy }      from "../services/search/announcementsStrategy.js";
import { publicMessagesStrategy }     from "../services/search/publicMessagesStrategy.js";
import { privateMessagesStrategy }    from "../services/search/privateMessagesStrategy.js";
import { SearchStrategy }             from "../services/search/SearchStrategy.js";
import { boardsStrategy }             from "../services/search/boardsStrategy.js";

const STRATEGIES = {
  citizens:          citizensByUsernameStrategy,
  citizens_status:   citizensByStatusStrategy,
  announcements:     announcementsStrategy,
  messages_public:   publicMessagesStrategy,
  messages_private:  privateMessagesStrategy,
  boards:            boardsStrategy,
};

const searchContext = new SearchStrategy(STRATEGIES);

export async function search(req, res) {
  try {
    const type = req.query.type || "";
    const params = { req, user: req.user };
    const result = await searchContext.executeSearch(type, params);
    
    if (result.code !== 200) {
      return res.status(result.code).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
