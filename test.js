const stream = require('./youtube-stream')
const express = require('express')
const fs = require('fs')
const app = express()
const port = 3000

app.set("view engine", "ejs");
// app.get('/', async (req, res) => {
//     try {
//       for await (const chunk of stream(`http://youtube.com/watch?v=aXnZfPqXshI`)) {
//         res.write(chunk)
//       }
//       res.end()
//     } catch (err) {
//       console.error(err)
//       if (!res.headersSent) {
//         res.writeHead(500)
//         res.end('internal system error')
//       }
//     }
//   });

//move this to the app.js
//find a way to transfer video details and length
//make a slider that calculates depending on its location what time to be on the video
app.get('/media', async (req, res) => {
    try {
        
        for await (const chunk of stream(`https://www.youtube.com/watch?v=DfJy_kyvGPs`)) {
        res.write(chunk)
        }
        res.end()
    } catch (err) {
        console.error(err)
        if (!res.headersSent) {
        res.writeHead(500)
        res.end('internal system error') 
        }
    }
});

app.get("/video", function (req, res) {

    const videoPath = "./media/aXnZfPqXshI.ogg";
    const videoStream = fs.createReadStream(videoPath);
    videoStream.pipe(res);
});

app.get('/', async (req, res) => {
   res.render('test'); 
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });