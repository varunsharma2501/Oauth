import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis"; // Correct import for googleapis
import dayjs from "dayjs"
import {v4 as uuid} from "uuid"


const app = express();
dotenv.config();

const calendar=google.calendar({
    version:"v3",
    auth:process.env.API_KEY
})

const oauth2Client = new google.auth.OAuth2(
    process.env.YOUR_CLIENT_ID,
    process.env.YOUR_CLIENT_SECRET,
    process.env.YOUR_REDIRECT_URL
);

const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://mail.google.com/',
];
// scopes: Permissions that the app requests from the user. These scopes allow access to the Calendar and Gmail APIs.

let storedRefreshToken = null;

oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        // Store the refresh_token in your database or a variable
        storedRefreshToken = tokens.refresh_token;
        console.log("Refresh token:", tokens.refresh_token);
    }
    console.log("Access token:", tokens.access_token);
});

// Initialize OAuth2 client with stored refresh token
if (storedRefreshToken) {
    oauth2Client.setCredentials({
        refresh_token: storedRefreshToken,
    });
}

app.get("/google", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes
    });
    res.redirect(url);
});

app.get("/google/redirect", async (req, res) => {
    const code=req.query.code;
    const {tokens}=await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    res.send("user successfully got the access");
});

app.get("/schedule_event",async(req,res)=>{
    await calendar.events.insert(
        {
            calendarId:'primary',
            auth:oauth2Client,
            conferenceDataVersion:1,
            requestBody:{
                summary:"I created this using google calendar api",
                description:"This is the event ",
                start:{
                    dateTime:dayjs(new Date()).add(1,"day").toISOString(),
                    timeZone:"Asia/Kolkata"
                },
                end:{
                    dateTime:dayjs(new Date()).add(1,"day").add(1,"hour").toISOString(),
                    timeZone:"Asia/Kolkata"
                },
                conferenceData:{
                    createRequest:{
                        requestId:uuid(),
                    }
                }
            }
        }
    )
    res.send({
        msg:"task Created success"
    });
})

app.get("/list_events")
app.get("/send_email", async (req, res) => {
    try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        const email=createEmail(
            'varuncares22@gmail.com',
            'abhinavaditya162@gmail.com',
            'This is the subject',
            "email aayi h "
        );
        
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: email,
            },
        });
        
        res.send({ msg: "Email sent successfully" });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send({ msg: "Failed to send email", error: error.message });
    }
});

function createEmail(from, to, subject, message) {
    const str = [
      `Content-Type: text/plain; charset="UTF-8"\n`,
      `MIME-Version: 1.0\n`,
      `Content-Transfer-Encoding: 7bit\n`,
      `To: ${to}\n`,
      `From: ${from}\n`,
      `Subject: ${subject}\n\n`,
      message,
    ].join('');
  
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

app.listen(3000, () => {
    console.log("server running on port 3000");
});