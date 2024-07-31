import dotenv from 'dotenv';
import { SESClient, SendEmailCommand, } from '@aws-sdk/client-ses';


// SES access credentions
dotenv.config();
const credentials = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.SESKEY,
        secretAccessKey: process.env.SESSECRET
    }
};
const localFront = process.env.FRONTEND;
const NODE_ENV = process.env.NODE_ENV;

// SES instance
const client = new SESClient(credentials);

const sesEmail = async (recipientEmail, name, confirmationToken, subdomain) => {

    let frontEnd;

    if (NODE_ENV === "development") {
        frontEnd = localFront;
    } else if (NODE_ENV === "production") {
        frontEnd = `https://${subdomain}.${localFront}`;
    }        

    let params = {
        Source: process.env.SESSENDER,
        Destination: {
            ToAddresses: [
                recipientEmail
            ],
        },
        ReplyToAddresses: [],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `<div class="m_-3407080369691297100u-row-container" style="padding:0px;background-color:transparent">
                <div class="m_-3407080369691297100u-row" style="Margin:0 auto;min-width:320px;max-width:500px;word-wrap:break-word;word-break:break-word;background-color:transparent">
                    <div style="border-collapse:collapse;display:table;width:100%;background-color:transparent">
                        <div class="m_-3407080369691297100u-col m_-3407080369691297100u-col-100" style="max-width:320px;min-width:500px;display:table-cell;vertical-align:top">
                            <div style="width:100%!important">
                                <div style="padding:0px;border-top:0px solid transparent;border-left:0px solid transparent;border-right:0px solid transparent;border-bottom:0px solid transparent">
                                    <table id="m_-3407080369691297100u_content_image_1" style="font-family:arial,helvetica,sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                        <tbody>
                                        <tr>
                                            <td style="word-break:break-word;padding:30px 20px;font-family:arial,helvetica,sans-serif" align="left">
                                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                    <tbody><tr>
                                                        <td style="padding-right:0px;padding-left:0px" align="center">
                                                            <a href="https://escortmundo.com/" target="_blank" style="font-family:'Leckerli One',arial,helvetica,sans-serif;text-decoration:none;font-size: 3rem; color: #ff1749;display:block;">
                                                                EscortMundo
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </tbody></table>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="m_-3407080369691297100u-row-container" style="padding:0px;background-color:transparent">
                <div class="m_-3407080369691297100u-row" style="Margin:0 auto;min-width:320px;max-width:500px;word-wrap:break-word;word-break:break-word;background-color:transparent">
                    <div style="border-collapse:collapse;display:table;width:100%;background-color:transparent">
                        <div class="m_-3407080369691297100u-col m_-3407080369691297100u-col-100" style="max-width:320px;min-width:500px;display:table-cell;vertical-align:top">
                            <div style="background-color:#f4f7fa;width:100%!important;border-radius:0px">
                                <div style="padding:20px;border-top:0px solid transparent;border-left:0px solid transparent;border-right:0px solid transparent;border-bottom:0px solid transparent;border-radius:0px">
    <table style="font-family:arial,helvetica,sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
        <tbody>
        <tr>
            <td style="word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif" align="left">
                <h1 style="margin:0px;line-height:140%;text-align:left;word-wrap:break-word;font-weight:normal;font-family:'Open Sans',sans-serif;font-size:14px">
                    Hi <a href="mailto:${name}" target="_blank">${name}</a>,<br> You are receiving this email to make sure the request to creation your account is approved by you.<br><br> To confirm your email address click on the button below:
                </h1>
            </td>
        </tr>
        </tbody>
    </table>
    <table style="font-family:arial,helvetica,sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
        <tbody>
        <tr>
            <td style="word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif" align="left">
                <div align="center"> 
                    <a href="${frontEnd}/signup/confirmed-account/?token=${confirmationToken}" style="box-sizing:border-box;display:inline-block;font-family:arial,helvetica,sans-serif;text-decoration:none;text-align:center;color:#ffffff;background-color:#ff1749;border-radius:4px;width:60%;max-width:100%;word-break:break-word;word-wrap:break-word" target="_blank">
                                  <span style="display:block;padding:16px 20px;line-height:140%"><strong><span style="font-family:'Open Sans',sans-serif;font-size:14px;line-height:19.6px"><span style="font-size:16px;line-height:22.4px">Confirm Account</span></span>
                                  </strong><br></span>
                    </a>
                </div>
            </td>
        </tr>
        </tbody>
    </table>
    <table style="font-family:arial,helvetica,sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
        <tbody>
        <tr>
            <td style="word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif" align="left">
                <h1 style="margin:0px;line-height:140%;text-align:left;word-wrap:break-word;font-weight:normal;font-family:'Open Sans',sans-serif;font-size:12px">
                    If you're having trouble with the button above, copy and paste the URL below into your web browser:
                    <br><br><span style="text-decoration:underline"><a rel="noopener" href="${frontEnd}/signup/confirmed-account/?token=${confirmationToken}" target="_blank">${frontEnd}/signup/confirmed-account/?token=${confirmationToken}</a></span>
                </h1>

            </td>
        </tr>
        </tbody>
    </table>
                                    <table style="font-family:arial,helvetica,sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                        <tbody>
                                        <tr>
                                            <td style="word-break:break-word;padding:10px;font-family:arial,helvetica,sans-serif" align="left">

                                                <h4 style="margin:0px;line-height:140%;text-align:left;word-wrap:break-word;font-weight:normal;font-family:'Open Sans',sans-serif;font-size:14px">
                                                    EscortMundo Team
                                                </h4>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="m_-3407080369691297100u-row-container" style="padding:0px;background-color:transparent">
                <div class="m_-3407080369691297100u-row" style="Margin:0 auto;min-width:320px;max-width:500px;word-wrap:break-word;word-break:break-word;background-color:transparent">
                    <div style="border-collapse:collapse;display:table;width:100%;background-color:transparent">
                        <div class="m_-3407080369691297100u-col m_-3407080369691297100u-col-100" style="max-width:320px;min-width:500px;display:table-cell;vertical-align:top">
                            <div style="width:100%!important;border-radius:0px">
                                <div style="padding:0px;border-top:0px solid transparent;border-left:0px solid transparent;border-right:0px solid transparent;border-bottom:0px solid transparent;border-radius:0px">
                                    <table style="font-family:arial,helvetica,sans-serif" role="presentation" cellpadding="0" cellspacing="0" width="100%" border="0">
                                        <tbody>
                                        <tr>
                                            <td style="word-break:break-word;padding:20px;font-family:arial,helvetica,sans-serif" align="left">
                                                <div style="line-height:140%;text-align:center;word-wrap:break-word">
                                                    <p style="font-size:14px;line-height:140%"><span style="font-size:12px;line-height:16.8px;font-family:'Open Sans',sans-serif">This email was sent to you by <a href="https://escortmunndo.com" target="_blank">https://escortmunndo.com</a> in accordance with our privacy policy. </span><span style="font-size:12px;line-height:16.8px;font-family:'Open Sans',sans-serif">If you have received this email by mistake please notify us via</span><br><span style="font-size:12px;line-height:16.8px;font-family:'Open Sans',sans-serif"><a href="mailto:support@escortmunndo.com" target="_blank">support@escortmunndo.com</a></span><br><span style="font-size:12px;line-height:16.8px;font-family:'Open Sans',sans-serif">This is an automatically generated email, please do not reply.</span>
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: 'This is the body of my email!',
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: `Verify your account`,
            }
        }
    };

    const command = new SendEmailCommand(params);

    try {
        const data = await client.send(command);
    } catch (error) {
        console.error(error.message);
    }
}

export { sesEmail };