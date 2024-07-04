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
    'https://www.googleapis.com/auth/drive',
];
// scopes: Permissions that the app requests from the user. These scopes allow access to the Calendar and Gmail APIs.

let storedRefreshToken = null;

oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        // Store the refresh_token in your database or a variable
        storedRefreshToken = tokens.refresh_token;
        // console.log("Refresh token:", tokens.refresh_token);
    }
    // console.log("Access token:", tokens.access_token);
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
            calendarId:'9556cdb3eb00214268e83582a74002ce84c432cb7d4ac4c5764afe76970ec5c0@group.calendar.google.com',
            auth:oauth2Client,
            conferenceDataVersion:1,
            requestBody:{
                summary:"Created event on 04/07/24",
                description:"Created event",
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

// this is normal list of events starting from toda
// app.get("/list_events", async (req, res) => {
//     try {
//         // Fetch list of calendars accessible to the user
//         const calendarsResponse = await calendar.calendarList.list({
//             auth: oauth2Client,
//         });

//         const calendars = calendarsResponse.data.items;

//         if (!calendars || calendars.length === 0) {
//             res.send('No calendars found.');
//             return;
//         }

//         const allEvents = [];

//         // Iterate over each calendar and fetch events
//         for (const calendarInfo of calendars) {
//             const calendarId = calendarInfo.id;
            
//             const eventsResponse = await calendar.events.list({
//                 calendarId: calendarId,
//                 auth: oauth2Client,
//                 timeMin: (new Date()).toISOString(),
//                 maxResults: 10, // Adjust as per your requirement
//                 singleEvents: true,
//                 orderBy: 'startTime',
//             });

//             const events = eventsResponse.data.items;

//             if (events.length > 0) {
//                 allEvents.push(...events.map(event => ({
//                     calendarId: calendarId,
//                     id: event.id,
//                     summary: event.summary,
//                     description: event.description,
//                     start: event.start.dateTime || event.start.date,
//                     end: event.end.dateTime || event.end.date,
//                     attendees: event.attendees ? event.attendees.map(attendee => attendee.email) : [],
//                 })));
//             }
//         }

//         res.json(allEvents);
//     } catch (error) {
//         console.error('Error fetching events:', error);
//         res.status(500).send("Failed to fetch events");
//     }
// });


// here i am specifying the start and end time 

app.get("/list_events", async (req, res) => {
    try {
        // Fetch list of calendars accessible to the user
        const calendarsResponse = await calendar.calendarList.list({
            auth: oauth2Client,
        });

        const calendars = calendarsResponse.data.items;

        if (!calendars || calendars.length === 0) {
            res.send('No calendars found.');
            return;
        }

        const allEvents = [];

        // Iterate over each calendar and fetch events
        for (const calendarInfo of calendars) {
            const calendarId = calendarInfo.id;
            const startDate = dayjs().subtract(1, 'month').startOf('month').toISOString(); // Start of last month
            const endDate = dayjs().subtract(1, 'month').endOf('month').toISOString();     // End of last month

            const eventsResponse = await calendar.events.list({
                calendarId: calendarId,
                auth: oauth2Client,
                timeMin: startDate,
                timeMax: endDate,
                maxResults: 3, // Adjust as per your requirement
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = eventsResponse.data.items;

            if (events.length > 0) {
                allEvents.push(...events.map(event => ({
                    calendarId: calendarId,
                    id: event.id,
                    summary: event.summary,
                    description: event.description,
                    start: event.start.dateTime || event.start.date,
                    end: event.end.dateTime || event.end.date,
                    attendees: event.attendees ? event.attendees.map(attendee => attendee.email) : [],
                })));
            }
        }

        res.json(allEvents);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send("Failed to fetch events");
    }
});


app.get("/deauthorize", async (req, res) => {
    try {
        if (oauth2Client.credentials.access_token) {
            await oauth2Client.revokeToken(oauth2Client.credentials.access_token);
            oauth2Client.credentials = {}; // Clear the credentials
            storedRefreshToken = null; // Clear the stored refresh token
            res.send("User successfully deauthorized");
        } else {
            res.status(400).send("No active access token found");
        }
    } catch (error) {
        res.status(500).send("Failed to deauthorize the user");
    }
});
// app.get("/send_email", async (req, res) => {
//     try {
//         const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
//         const email=createEmail(
//             'varuncares22@gmail.com',
//             'abhinavaditya162@gmail.com',
//             'This is the subject',
//             "email aayi h "
//         );
        
//         await gmail.users.messages.send({
//             userId: 'me',
//             requestBody: {
//                 raw: email,
//             },
//         });
        
//         res.send({ msg: "Email sent successfully" });
//     } catch (error) {
//         console.error('Error sending email:', error);
//         res.status(500).send({ msg: "Failed to send email", error: error.message });
//     }
// });

// function createEmail(from, to, subject, message) {
//     const str = [
//       `Content-Type: text/plain; charset="UTF-8"\n`,
//       `MIME-Version: 1.0\n`,
//       `Content-Transfer-Encoding: 7bit\n`,
//       `To: ${to}\n`,
//       `From: ${from}\n`,
//       `Subject: ${subject}\n\n`,
//       message,
//     ].join('');
  
//     return Buffer.from(str)
//       .toString('base64')
//       .replace(/\+/g, '-')
//       .replace(/\//g, '_')
//       .replace(/=+$/, '');
//   }

app.listen(3000, () => {
    console.log("server running on port 3000");
});

