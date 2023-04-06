const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "ssl0.ovh.net",
    port: 465,
    secure: true,
    auth: {
        user: "contact@impin.fr",
        pass: "Tablette01",
    },
});

const sendPasswordResetEmail = async (email, resetToken) => {
    const message = 
`Hey there,

It's the Impin team.
We received a request to reset your password.
If you did not make this request, make sure to change your password as soon as possible.

If you did make this request, click on the link below to reset your password.
https://impin.fr/reset/${resetToken}

Have a nice day,
The Impin team.
`;


const mailOptions = {
        from: "Impin@impin.fr",
        to: email,
        subject: "Do not reply",
        text: message,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Message envoyé: " + info.response);
    } catch (error) {
        console.log(error);
    }
};

module.exports = {
    sendPasswordResetEmail,
};
