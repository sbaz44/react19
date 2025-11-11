const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const { isAuthenticated } = require("./helper");
var cors = require('cors');
app.use(express.json()); //for handling json data
const corsOpts = {
    origin: '*',
    // methods: [
    //     'GET',
    //     'POST',
    // ],

    // allowedHeaders: [
    //     'Content-Type',
    // ],
};

app.use(cors(corsOpts));

app.listen(5000, () => {
    console.log("Server running on port 5000");
});

app.post("/login", (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res
            .status(400)
            .json({ success: false, error: "enter valid credientials" });
    }
    const accessToken = jwt.sign({ email: email }, "accessSecret", {
        expiresIn: "20s",
    });
    const refreshToken = jwt.sign({ email: email }, "refreshSecret", {
        expiresIn: "2m",
    });
    //Ps. The expiresIn time is just for testing purpose you can    change it later accordingly.
    return res.status(200).json({ accessToken, refreshToken });
});

app.get("/protected", isAuthenticated, (req, res) => {
    res.json({
        success: true, msg: "Welcome user!!", email: req.email
    });
});