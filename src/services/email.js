require("dotenv").config();
const { SendMailClient } = require("zeptomail");
const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");

const client = new SendMailClient({
  url: process.env.ZEPTO_URL,
  token: process.env.ZEPTO_TOKEN,
});

const readMyFileAndReturnPromise = (dirpath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(dirpath, { encoding: "utf-8" }, (err, fileRead) => {
      if (err) reject(err);
      resolve(fileRead);
    });
  });
};

const readFileAndSendEmail = async (
  toEmail,
  emailHeader,
  dataReplacement,
  filename,
) => {
  try {
    let dirpath = path.join(
      __dirname,
      `../views/emails-template/${filename}.html`,
    );
    let readTheFile = await readMyFileAndReturnPromise(dirpath);

    const template = Handlebars.compile(readTheFile);
    const result = template(dataReplacement);

    await client.sendMail({
      from: {
        address: process.env.FARMEELY_EMAIL_SENDER,
        name: "Farmeely",
      },
      to: [
        {
          email_address: {
            address: toEmail,
          },
        },
      ],
      subject: emailHeader,
      htmlbody: result,
    });

    return "SUCCESS";
  } catch (error) {
    console.error("ZeptoMail error:", error);
    return "FAILED";
  }
};

module.exports = {
  readFileAndSendEmail,
};
