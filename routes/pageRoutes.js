import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.render("splashPage");
});

//TODO: change name to RESTful
router.get("/community", (req, res) => {
    res.render("joinCommunity");
});

router.get("/confirmations", (req, res) => {
    res.render("confirmRegistration");
});

router.get("/acknowledgements", (req, res) => {
    res.render("acknowledgement");
});

router.get("/profiles", (req, res) => {
    res.render("profile");
});

export default router;
