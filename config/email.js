import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';


// Get the current file path
const __filename = fileURLToPath(import.meta.url);
// Derive the directory path
const __dirname = dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  }
});

const options = {
  viewEngine: {
    extname: 'hbs',
    defaultLayout: 'email',
    layoutsDir: join(__dirname, '../views/layouts'),
    partialsDir: [
      //  path to your partials
      join(__dirname, '../views/partials/emails')
    ]
  },
  viewPath: join(__dirname, 'views/emails/')
};

transporter.use('compile', hbs(options));

const sendEmail = mailOptions => {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('hello error', error);
        reject(error);
      } else {
        console.log('Email sent: ' + info.response);
        resolve(info);
      }
    });
  });
};

export { sendEmail };