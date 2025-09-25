import express from "express";

const router = express.Router();
const JOIN_PATH = "joinCommunity/";
const PUB_CHAT_PATH = "publicChat/";

router.get("/", (req, res) => {
    res.render(JOIN_PATH + "splashPage");
});

//TODO: change name to RESTful
router.get("/join", (req, res) => {
    res.render(JOIN_PATH + "joinCommunity");
});

router.get("/confirmations", (req, res) => {
    res.render(JOIN_PATH + "confirmRegistration");
});

router.get("/acknowledgements", (req, res) => {
    res.render(JOIN_PATH + "acknowledgement");
});

router.get("/profiles", (req, res) => {
    res.render(JOIN_PATH + "profile");
});

router.get("/chat", (req, res) => {
    res.render(PUB_CHAT_PATH + "publicChat");
});

export default router;
